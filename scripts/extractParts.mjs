// male_sample.vrm 에서 검증용 실측 파츠를 떼어낸다 (④/⑤ 스탠드인 생성기).
//   Tops_sample.glb  — 상의. plain GLTFLoader 용, VRM 확장 제거. (④ 검증)
//   Hair_sample.vrm  — 헤어. VRMLoaderPlugin 용, VRMC_springBone 보존(헤어 스프링만). (⑤ 검증)
//
// 방식: raw glTF 수술. VRoid 통짜 export 안에서 파츠는 이미 별도 mesh/primitive 다.
//   '모든 노드 + bin 통째 유지' → 스프링/콜라이더의 node 인덱스 참조가 그대로 유효(재매핑 불필요).
//   원하는 mesh 만 노드에 남기고 나머지 mesh 참조를 끊는다.
//
// 실행: node scripts/extractParts.mjs

import fs from 'fs'

const SRC = 'public/avatars/male_sample.vrm'
const MAGIC = 0x46546c67
const JSON_CHUNK = 0x4e4f534a
const BIN_CHUNK = 0x004e4942

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

// keepMeshIdx 의 mesh 만 노드에 남기고 나머지 mesh 노드 참조 제거. (json 은 fresh copy 로 받음)
function keepOnlyMesh(g, keepMeshIdx, newMeshName) {
  g.meshes[keepMeshIdx].name = newMeshName
  g.nodes.forEach((n) => {
    if (n.mesh !== undefined && n.mesh !== keepMeshIdx) delete n.mesh
  })
}

function freshJson() {
  return JSON.parse(JSON.stringify(parsed.json))
}

const parsed = parseGLB(SRC)
const bin = parsed.bin

// 어떤 mesh 가 Tops/Hair 인지 식별 (머티리얼/메시명 기준)
function findMesh(pred) {
  return parsed.json.meshes.findIndex((m, mi) =>
    m.primitives.some((p) => pred(parsed.json.materials?.[p.material]?.name ?? '', m.name)),
  )
}
const topsMesh = findMesh((mat) => mat.includes('Tops'))
const hairMesh = findMesh((mat, name) => /hair/i.test(name) && mat.includes('Hair'))

// ── ④ Tops_sample.glb ── plain GLTFLoader: VRM 확장 제거
{
  const g = freshJson()
  // Tops 가 든 mesh 에서 Tops 프리미티브만 남김 (그 mesh 엔 body-skin/hairback prim 도 섞여 있음)
  const m = g.meshes[topsMesh]
  m.primitives = m.primitives.filter((p) => (g.materials?.[p.material]?.name ?? '').includes('Tops'))
  keepOnlyMesh(g, topsMesh, 'Tops_sample')
  delete g.extensionsRequired
  delete g.extensions
  fs.writeFileSync('public/avatars/Tops_sample.glb', packGLB(g, bin))
}

// ── ⑤ Hair_sample.vrm ── VRMLoaderPlugin: 확장 보존, 스프링은 헤어만
let hairSpringCount = 0
{
  const g = freshJson()
  keepOnlyMesh(g, hairMesh, 'Hair_sample')
  // 스프링을 헤어 체인만 남김 (joints 가 J_Sec_Hair* 노드를 참조하는 것). 노드는 다 유지 → 인덱스 유효.
  const sb = g.extensions?.VRMC_springBone
  if (sb?.springs) {
    sb.springs = sb.springs.filter((s) =>
      s.joints?.some((j) => (g.nodes[j.node]?.name ?? '').includes('Hair')),
    )
    hairSpringCount = sb.springs.length
  }
  // VRMC_vrm / VRMC_springBone / mtoon / extensionsRequired 는 그대로 유지(플러그인이 처리)
  fs.writeFileSync('public/avatars/Hair_sample.vrm', packGLB(g, bin))
}

// 자가검수
function summary(path) {
  const re = parseGLB(path)
  const rn = re.json.nodes.filter((n) => n.mesh !== undefined)
  return { mb: (fs.statSync(path).size / 1024 / 1024).toFixed(1), render: rn.length, skinned: rn.filter((n) => n.skin !== undefined).length, sb: re.json.extensions?.VRMC_springBone?.springs?.length }
}
const t = summary('public/avatars/Tops_sample.glb')
const h = summary('public/avatars/Hair_sample.vrm')
console.log(`✅ Tops_sample.glb (${t.mb}MB) 렌더노드 ${t.render} 스킨드 ${t.skinned}`)
console.log(`✅ Hair_sample.vrm (${h.mb}MB) 렌더노드 ${h.render} 스킨드 ${h.skinned} | 헤어 스프링 ${hairSpringCount} (전체 33에서 필터)`)
