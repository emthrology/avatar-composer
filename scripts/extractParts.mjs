// VRoid 소스 VRM에서 부위별 파츠를 떼어낸다 (라이브러리 추출기).
//   정적 의류(상의/하의/액세서리) → GLB (VRM 확장 제거, plain GLTFLoader 용)
//   스프링 물리(흔들 헤어) → VRM (VRMC_springBone 보존, VRMLoaderPlugin 용)
//
// 방식: raw glTF 수술. VRoid 통짜 export 안에서 부위는 이미 별도 mesh/머티리얼(프리미티브)다.
//   '모든 노드 + bin 통째 유지' → 스프링/콜라이더/IBM의 node·accessor 참조가 그대로 유효.
//   타깃 mesh만 노드에 남기고(필요시 머티리얼로 프리미티브까지 필터) 나머지 mesh 참조를 끊는다.
//   ※ 본 prune은 아직 안 함(파일 비대) → 후속 gltf-transform 단계 과제. loadPart 는 미사용 본을
//     'weighted 일 때만' 누락 보고하므로 기능엔 무해.
//
// 실행: node scripts/extractParts.mjs

import fs from 'fs'

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

  if (job.vrm) {
    // VRM 유지: 스프링을 지정 체인만 남김(노드 인덱스 보존 → 참조 유효)
    const sb = g.extensions?.VRMC_springBone
    if (sb?.springs && job.springKeep) {
      sb.springs = sb.springs.filter((s) =>
        s.joints?.some((j) => (g.nodes[j.node]?.name ?? '').includes(job.springKeep)),
      )
    }
  } else {
    // GLB: VRM 확장 제거(순수 GLTFLoader)
    delete g.extensionsRequired
    delete g.extensions
  }

  fs.writeFileSync(`${DIR}/${job.out}`, packGLB(g, bin))

  // 자가검수
  const re = parseGLB(`${DIR}/${job.out}`)
  const rn = re.json.nodes.filter((n) => n.mesh !== undefined)
  const mb = (fs.statSync(`${DIR}/${job.out}`).size / 1024 / 1024).toFixed(1)
  const springs = re.json.extensions?.VRMC_springBone?.springs?.length
  const prims = re.json.meshes[meshIdx].primitives.length
  console.log(
    `✅ ${job.out} (${mb}MB) 렌더노드 ${rn.length}·prim ${prims}` +
      (job.vrm ? ` · 스프링 ${springs}` : ' · GLB'),
  )
}

for (const job of JOBS) runJob(job)
