import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import * as THREE from 'three'

// ─── 더미 파츠 팩토리 (PoC 검증 자산) ───────────────────────────────────────
// 실제 authored GLB 파츠가 들어오기 전까지, 조립 메커니즘을 코드로 생성한 더미로 검증한다.
//   makeHairCap   → 리지드 부착(head 본 parent)
//   makeShirtShell→ 스킨드 rebind(바디 형상 복제→법선 오프셋→공유 스켈레톤 bind)
// 둘 다 drei-avatar-project PoC에서 "팔/머리 흔들기 추종"으로 검증됨.
// 다음 마일스톤: loadPart(url) 로 실제 GLB 파츠를 같은 스켈레톤에 bind (아래 TODO).
// ───────────────────────────────────────────────────────────────────────────

// 리지드 부착용 헤어 캡 — head 원시 본에 parent
export function makeHairCap(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.11, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6)
  geo.scale(1.05, 1.15, 1.1)
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.name = 'DUMMY_Hair_cap'
  mesh.position.set(0, 0.06, 0.005)
  return mesh
}

// 스킨드 rebind 검증용 셔츠 쉘 — 바디 메시 형상 복제 → 법선 오프셋 → 공유 스켈레톤 bind.
// (실 파이프라인에선 이 자리에 Blender authored 옷 GLB가 들어감)
export function makeShirtShell(vrm: VRM): THREE.SkinnedMesh | null {
  let src: THREE.SkinnedMesh | null = null
  vrm.scene.traverse((o) => {
    const sm = o as THREE.SkinnedMesh
    if (sm.isSkinnedMesh && !src && /body|tops|cloth|costume/i.test(o.name)) src = sm
  })
  if (!src) {
    vrm.scene.traverse((o) => {
      const sm = o as THREE.SkinnedMesh
      if (sm.isSkinnedMesh && !src) src = sm
    })
  }
  if (!src) return null
  const source = src as THREE.SkinnedMesh

  const geo = source.geometry.clone()
  const pos = geo.attributes.position as THREE.BufferAttribute
  const nor = geo.attributes.normal as THREE.BufferAttribute | undefined
  if (nor) {
    const off = 0.015 // 법선 1.5cm 부풀려 살 위에 뜨는 '겉옷 쉘'로 가시화
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) + nor.getX(i) * off,
        pos.getY(i) + nor.getY(i) * off,
        pos.getZ(i) + nor.getZ(i) * off,
      )
    }
    pos.needsUpdate = true
  }

  const mat = new THREE.MeshStandardMaterial({
    color: 0x3358ff, roughness: 0.6, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
  })
  const shirt = new THREE.SkinnedMesh(geo, mat)
  shirt.name = 'DUMMY_Tops_shell'
  shirt.bind(source.skeleton, source.bindMatrix) // 핵심: 새 SkinnedMesh를 공유 스켈레톤에 bind
  shirt.frustumCulled = false
  return shirt
}

// 정리 — 부착 파츠 dispose
export function disposeObject(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.geometry) m.geometry.dispose()
    if (m.material) {
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      mats.forEach((mat) => mat.dispose())
    }
  })
}

// 헤어를 head 원시 본에 부착 (리지드)
export function attachHair(vrm: VRM, hair: THREE.Object3D): boolean {
  const headRaw = vrm.humanoid.getRawBoneNode(VRMHumanBoneName.Head)
  if (!headRaw) return false
  headRaw.add(hair)
  return true
}

// 실제 authored GLB 파츠 로더는 ./partLoader.ts 의 loadPart() 로 분리(스캐폴딩 완료).
//   - ④ 외부 GLB → base 스켈레톤 rebind: 구현 완료, PART_TEST_URL 로 검증 대기.
//   - ⑤ 스프링본 병합 / ⑥ Hide_Body 클리핑: 에셋 메타데이터 합의 후(partLoader.ts 하단 참조).
