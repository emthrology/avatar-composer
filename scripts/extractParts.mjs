// VRoid 소스 VRM에서 부위별 파츠를 떼어낸다 (라이브러리 추출기).
//   정적 의류(상의/하의/액세서리) → GLB (VRM 확장 제거, plain GLTFLoader 용)
//   스프링 물리(흔들 헤어) → VRM (VRMC_springBone 보존, VRMLoaderPlugin 용)
//
// 방식: raw glTF 수술. VRoid 통짜 export 안에서 부위는 이미 별도 mesh/머티리얼(프리미티브)다.
//   '모든 노드 + bin 통째 유지' → 스프링/콜라이더/IBM의 node·accessor 참조가 그대로 유효.
//   타깃 mesh만 노드에 남기고(필요시 머티리얼로 프리미티브까지 필터) 나머지 mesh 참조를 끊는다.
//
// 본/지오메트리/텍스처 prune (GLB 전용):
//   raw 수술은 참조 무결성을 위해 끊긴 Face 메시·미사용 머티리얼·텍스처를 bin에 통째로 남긴다
//   (파츠당 ~13MB). 정적 GLB는 확장이 없어 안전하므로 gltf-transform prune+dedup으로 회수한다
//   → ~1MB. VRM(스프링)은 gltf-transform이 VRMC_springBone을 모르고 써내며 떨궈버리므로 prune
//   대상에서 제외(raw 유지). VRM 본 prune은 VRM 인지 prune 도입 후 후속 과제.
//
// 스프링 본 네임스페이싱 (VRM 전용):
//   VRoid는 헤어마다 J_Sec_Hair* 본 이름을 재사용한다 → 여러 스프링 파츠를 동시에 base Head로
//   이식하면 이름 충돌(rebind 가 엉뚱한 본에 매칭). 추출 시 헤어 스프링 노드 name에 파츠 prefix를
//   붙여 전역 고유화한다. 스프링/스킨 조인트는 인덱스 참조라 name 변경에 안전하고, 런타임 매칭
//   (/Hair/i graft + 정확한 이름 rebind)은 prefix가 붙어도 'Hair' 부분문자열·고유성 모두 유지.
//
// 실행: node scripts/extractParts.mjs

import fs from 'fs'
import { NodeIO } from '@gltf-transform/core'
import { prune, dedup } from '@gltf-transform/functions'

const DIR = 'public/avatars'
const MAGIC = 0x46546c67
const JSON_CHUNK = 0x4e4f534a
const BIN_CHUNK = 0x004e4942

// ── 추출 잡 정의 ── (부위 추가 = 여기에 한 줄)
const JOBS = [
  { src: 'male1/parts/male_white_shirt.vrm',  mesh: 'Body', keepMaterial: 'Tops_01_CLOTH',    out: 'male1/Tops_white_shirt.glb',    vrm: false },
  { src: 'male1/parts/male_scotch_pants.vrm', mesh: 'Body', keepMaterial: 'Bottoms_01_CLOTH', out: 'male1/Bottoms_scotch_pants.glb', vrm: false },
  { src: 'male_sample.vrm',                   mesh: 'Hair',                                     out: 'Hair_sample.vrm', vrm: true, springKeep: 'Hair' },
]

function parseGLB(path) {
  const buf = fs.readFileSync(path)
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let off = 12
  let json = null
  let bin = null
  while (off < buf.length) {
    const len = dv.getUint32(off, true)
    const type = dv.getUint32(off + 4, true)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === JSON_CHUNK) json = JSON.parse(new TextDecoder().decode(data))
    if (type === BIN_CHUNK) bin = Buffer.from(data)
    off += 8 + len
  }
  return { json, bin }
}

function packGLB(json, bin) {
  const enc = new TextEncoder().encode(JSON.stringify(json))
  const jsonPad = (4 - (enc.length % 4)) % 4
  const binPad = (4 - (bin.length % 4)) % 4
  const total = 12 + 8 + enc.length + jsonPad + 8 + bin.length + binPad
  const out = Buffer.alloc(total)
  let p = 0
  out.writeUInt32LE(MAGIC, p); p += 4
  out.writeUInt32LE(2, p); p += 4
  out.writeUInt32LE(total, p); p += 4
  out.writeUInt32LE(enc.length + jsonPad, p); p += 4
  out.writeUInt32LE(JSON_CHUNK, p); p += 4
  Buffer.from(enc).copy(out, p); p += enc.length
  out.fill(0x20, p, p + jsonPad); p += jsonPad
  out.writeUInt32LE(bin.length + binPad, p); p += 4
  out.writeUInt32LE(BIN_CHUNK, p); p += 4
  bin.copy(out, p); p += bin.length
  out.fill(0x00, p, p + binPad)
  return out
}

// gltf-transform prune+dedup 으로 GLB 압축(끊긴 메시·미사용 머티리얼/텍스처/액세서리 제거).
// 정적 GLB 한정 — VRM 확장이 없어 무손실로 안전.
async function pruneGlb(path) {
  const io = new NodeIO()
  const doc = await io.read(path)
  await doc.transform(prune(), dedup())
  await io.write(path, doc)
}

function runJob(job) {
  const { json: g, bin } = parseGLB(`${DIR}/${job.src}`)

  // 타깃 mesh 인덱스
  const meshIdx = g.meshes.findIndex((m) => new RegExp(job.mesh, 'i').test(m.name))
  if (meshIdx < 0) throw new Error(`${job.src}: mesh "${job.mesh}" 없음`)

  // 머티리얼 필터(있으면) — 타깃 mesh 안에서 해당 프리미티브만 남김
  if (job.keepMaterial) {
    const kept = g.meshes[meshIdx].primitives.filter((p) =>
      (g.materials?.[p.material]?.name ?? '').includes(job.keepMaterial),
    )
    if (!kept.length) throw new Error(`${job.src}: material "${job.keepMaterial}" 없음`)
    g.meshes[meshIdx].primitives = kept
  }
  g.meshes[meshIdx].name = job.out.split('/').pop().replace(/\.\w+$/, '')

  // 나머지 mesh 는 노드 참조 제거(렌더 끊기) — node·accessor 인덱스는 유지
  g.nodes.forEach((n) => {
    if (n.mesh !== undefined && n.mesh !== meshIdx) delete n.mesh
  })

  let renamed = 0
  if (job.vrm) {
    // VRM 유지: 스프링을 지정 체인만 남김(노드 인덱스 보존 → 참조 유효)
    const sb = g.extensions?.VRMC_springBone
    if (sb?.springs && job.springKeep) {
      sb.springs = sb.springs.filter((s) =>
        s.joints?.some((j) => (g.nodes[j.node]?.name ?? '').includes(job.springKeep)),
      )
    }
    // 스프링 본 네임스페이싱: 헤어 스프링 노드(J_Sec_*Hair*)에 파츠 prefix → 다중 파츠 충돌 방지
    const prefix = job.ns ?? job.out.split('/').pop().replace(/\.\w+$/, '')
    g.nodes.forEach((n) => {
      if (n.name && /^J_Sec_/.test(n.name) && /Hair/i.test(n.name)) {
        n.name = `${prefix}__${n.name}`
        renamed++
      }
    })
  } else {
    // GLB: VRM 확장 제거(순수 GLTFLoader)
    delete g.extensionsRequired
    delete g.extensions
  }

  fs.writeFileSync(`${DIR}/${job.out}`, packGLB(g, bin))
  return { meshIdx, renamed }
}

for (const job of JOBS) {
  const { meshIdx, renamed } = runJob(job)
  if (!job.vrm) await pruneGlb(`${DIR}/${job.out}`) // GLB만 prune

  // 자가검수
  const re = parseGLB(`${DIR}/${job.out}`)
  const rn = re.json.nodes.filter((n) => n.mesh !== undefined)
  const mb = (fs.statSync(`${DIR}/${job.out}`).size / 1024 / 1024).toFixed(1)
  const springs = re.json.extensions?.VRMC_springBone?.springs?.length
  // 렌더되는 mesh(노드가 참조하는 것)의 prim 만 집계 — prune 으로 mesh 인덱스가 바뀌어도, VRM 의
  // 죽은 mesh(참조 끊김)가 남아 있어도 정확.
  const renderedMeshes = new Set(rn.map((n) => n.mesh))
  const prims = [...renderedMeshes].reduce((s, mi) => s + re.json.meshes[mi].primitives.length, 0)
  console.log(
    `✅ ${job.out} (${mb}MB) 렌더노드 ${rn.length}·prim ${prims}` +
      (job.vrm ? ` · 스프링 ${springs} · 네임스페이스 ${renamed}본` : ' · GLB·pruned'),
  )
}
