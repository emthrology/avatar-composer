import { VRM, VRMHumanBoneName, VRMLoaderPlugin } from '@pixiv/three-vrm'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// ─── 실제 authored GLB 파츠 로더 (미증명 ④의 검증 경로) ────────────────────────
// dummyParts 의 makeShirtShell 은 "베이스 바디를 복제"해 같은 스켈레톤에 bind 했다 —
// 즉 소스 스켈레톤과 타깃 스켈레톤이 애초에 동일 객체였다. 실제 외주 파츠는 GLB 안에
// '자기 자신의 스켈레톤'을 들고 들어온다. 따라서 진짜 리스크는:
//   "외부 SkinnedMesh 의 자체 스켈레톤 → base 스켈레톤으로 rebind 했을 때 변형 추종되는가"
// 이 파일이 그 경로다. ASSET_SPEC §1 컨벤션 락(동일 본 이름 / A-pose / scale 1.0)을 전제로
// 본 이름 매칭 후 boneInverses 를 재사용해 rebind 한다.
// ───────────────────────────────────────────────────────────────────────────

export interface LoadedPart {
  root: THREE.Object3D // base scene 에 추가된 객체(또는 head 본에 부착된 리지드 루트)
  skinned: THREE.SkinnedMesh[] // base 스켈레톤으로 rebind 된 스킨드 메시
  rigid: THREE.Object3D[] // head 본 등에 리지드 부착된 객체
  missingBones: string[] // base 에서 못 찾은 '가중된' 본 이름(파츠 규약 위반 신호)
  setVisible: (v: boolean) => void
  dispose: () => void
}

// 지오메트리에서 실제 가중(weight>0)된 본 인덱스 집합. skinIndex 는 skeleton.bones 배열 인덱스.
function usedBoneIndices(geo: THREE.BufferGeometry): Set<number> {
  const used = new Set<number>()
  const idx = geo.getAttribute('skinIndex')
  const wgt = geo.getAttribute('skinWeight')
  if (!idx || !wgt) return used
  for (let i = 0; i < idx.count; i++) {
    for (let k = 0; k < 4; k++) {
      if (wgt.getComponent(i, k) > 0) used.add(idx.getComponent(i, k))
    }
  }
  return used
}

// base VRM 의 '원시 본'을 이름→Bone 으로 인덱싱. 파츠 스키닝이 참조하는 실제 본들이다.
function indexBaseBones(baseVrm: VRM): Map<string, THREE.Bone> {
  const map = new Map<string, THREE.Bone>()
  baseVrm.scene.traverse((o) => {
    const b = o as THREE.Bone
    if (b.isBone && !map.has(b.name)) map.set(b.name, b)
  })
  return map
}

// 외부 SkinnedMesh 를 base 스켈레톤으로 rebind.
// 핵심: 지오메트리의 skinIndex 는 '원본 skeleton.bones 배열의 인덱스'를 가리키므로,
// 같은 순서로 base 본을 치환한 새 본 배열을 만들어야 한다. boneInverses 는 바인드 포즈가
// 락(동일 A-pose)이므로 원본 것을 재사용한다(미세 차이 시 ASSET_SPEC §1 위반 → 납품 리젝).
function rebindToBase(
  sm: THREE.SkinnedMesh,
  baseBoneByName: Map<string, THREE.Bone>,
  missing: string[],
): void {
  const orig = sm.skeleton
  const used = usedBoneIndices(sm.geometry) // 미사용 본(VRoid 잔존 스프링 본 등)은 누락 보고 제외
  const bones = orig.bones.map((b, i) => {
    const match = baseBoneByName.get(b.name)
    if (!match) {
      if (used.has(i)) missing.push(b.name) // 가중된 본이 base 에 없을 때만 규약 위반
      return b // fallback: 원본 본 유지
    }
    return match
  })
  const skeleton = new THREE.Skeleton(bones, orig.boneInverses.map((m) => m.clone()))
  sm.bind(skeleton, sm.bindMatrix)
  sm.frustumCulled = false // 변형으로 바운딩박스가 어긋나 컬링되는 사고 방지
}

// authored GLB 파츠 1개를 로드해 base VRM 에 조립한다.
//   - 스킨드 파츠(상의/하의/스킨 헤어): SkinnedMesh 를 base 스켈레톤으로 rebind 후 scene 에 add
//   - 리지드 파츠(고정 헤어): 스킨드 메시가 없으면 head 원시 본에 통째로 parent
export async function loadPart(url: string, baseVrm: VRM): Promise<LoadedPart> {
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(url)

  const baseBoneByName = indexBaseBones(baseVrm)
  const missingBones: string[] = []
  const skinned: THREE.SkinnedMesh[] = []

  gltf.scene.traverse((o) => {
    const sm = o as THREE.SkinnedMesh
    if (sm.isSkinnedMesh) skinned.push(sm)
  })

  const rigid: THREE.Object3D[] = []

  if (skinned.length > 0) {
    // 스킨드 파츠: 메시만 떼어 base 스켈레톤에 rebind
    for (const sm of skinned) {
      rebindToBase(sm, baseBoneByName, missingBones)
      sm.removeFromParent()
      baseVrm.scene.add(sm)
    }
  } else {
    // 리지드 파츠: head 원시 본에 통째로 부착
    const headRaw = baseVrm.humanoid.getRawBoneNode(VRMHumanBoneName.Head)
    if (headRaw) {
      headRaw.add(gltf.scene)
      rigid.push(gltf.scene)
    }
  }

  const dispose = () => {
    for (const sm of skinned) {
      sm.removeFromParent()
      sm.geometry.dispose()
      const mats = Array.isArray(sm.material) ? sm.material : [sm.material]
      mats.forEach((m) => m.dispose())
    }
    for (const r of rigid) {
      r.removeFromParent()
      r.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        if (m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material]
          mats.forEach((mat) => mat.dispose())
        }
      })
    }
  }

  const setVisible = (v: boolean) => {
    skinned.forEach((m) => { m.visible = v })
    rigid.forEach((r) => { r.visible = v })
  }

  return {
    root: skinned.length > 0 ? baseVrm.scene : gltf.scene,
    skinned,
    rigid,
    missingBones,
    setVisible,
    dispose,
  }
}

// ─── ⑤ 스프링 헤어 로딩 + 동적 병합 (VRM 파츠) ───────────────────────────────
// 스프링 헤어는 ④와 다르다: 헤어가 쓰는 J_Sec_Hair* 본이 base 에 없고(이식 필요),
// 흔들림이 VRMC_springBone 에 실려 온다(병합 필요). 그래서 plain GLTFLoader 가 아니라
// VRMLoaderPlugin 으로 로드해 three-vrm 이 만들어 준 springBoneManager 를 가져온다.
//   1) 헤어 스프링 본 체인을 base 의 Head 원시 본 아래로 이식(reparent)
//   2) 헤어 SkinnedMesh 를 base 스켈레톤(+이식된 헤어 본)으로 rebind
//   3) 파츠 매니저의 joint 들을 base.springBoneManager 에 addJoint → base.update(delta) 가 흔듦
// 알려진 단순화(검증 목적): 콜라이더는 파츠 bind 포즈 위치에 머묾(헤어 sway 자체엔 영향 미미),
//   그리고 스탠드인은 base 보다 2.5cm 커서 헤어도 그만큼 떠 보임(④와 동일, loadPart 버그 아님).

export interface LoadedSpringPart {
  mesh: THREE.SkinnedMesh | null
  graftedBones: THREE.Object3D[] // base Head 아래로 이식된 헤어 스프링 본 루트
  mergedJoints: number // base 매니저에 병합된 스프링 조인트 수
  missingBones: string[]
  setVisible: (v: boolean) => void
  dispose: () => void
}

export async function loadSpringPart(url: string, baseVrm: VRM): Promise<LoadedSpringPart> {
  const loader = new GLTFLoader()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader.register((parser: any) => new VRMLoaderPlugin(parser))
  const gltf = await loader.loadAsync(url)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partVrm: VRM = (gltf as any).userData?.vrm
  if (!partVrm) throw new Error('VRM 파츠가 아님 (VRMC_vrm 없음)')

  const baseHead = baseVrm.humanoid.getRawBoneNode(VRMHumanBoneName.Head)
  const partHead = partVrm.humanoid.getRawBoneNode(VRMHumanBoneName.Head)

  // 1) 헤어 스프링 본 체인(J_Sec_Hair*)을 base Head 아래로 이식. local transform 보존됨.
  const graftedBones: THREE.Object3D[] = []
  if (baseHead && partHead) {
    for (const child of [...partHead.children]) {
      if ((child as THREE.Bone).isBone && /Hair/i.test(child.name)) {
        baseHead.add(child) // reparent
        graftedBones.push(child)
      }
    }
  }

  // 2) 헤어 SkinnedMesh 를 base 스켈레톤으로 rebind (이식된 헤어 본은 이제 base scene 에 있어 매칭됨)
  let mesh: THREE.SkinnedMesh | null = null
  partVrm.scene.traverse((o) => {
    const sm = o as THREE.SkinnedMesh
    if (sm.isSkinnedMesh && !mesh) mesh = sm
  })
  const missingBones: string[] = []
  if (mesh) {
    const m = mesh as THREE.SkinnedMesh
    const baseBoneByName = indexBaseBones(baseVrm) // 이식 후 호출 → 헤어 본 포함
    rebindToBase(m, baseBoneByName, missingBones)
    m.removeFromParent()
    baseVrm.scene.add(m)
  }

  // 3) 스프링 조인트 병합
  let mergedJoints = 0
  const partMgr = partVrm.springBoneManager
  const baseMgr = baseVrm.springBoneManager
  const merged: unknown[] = []
  if (partMgr && baseMgr) {
    for (const joint of partMgr.joints) {
      baseMgr.addJoint(joint)
      merged.push(joint)
      mergedJoints++
    }
    baseMgr.setInitState()
  }

  const dispose = () => {
    if (baseMgr) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const j of merged) baseMgr.deleteJoint(j as any)
    }
    for (const b of graftedBones) b.removeFromParent()
    if (mesh) {
      const m = mesh as THREE.SkinnedMesh
      m.removeFromParent()
      m.geometry.dispose()
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      mats.forEach((mat) => mat.dispose())
    }
  }

  const setVisible = (v: boolean) => { if (mesh) (mesh as THREE.SkinnedMesh).visible = v }

  return { mesh, graftedBones, mergedJoints, missingBones, setVisible, dispose }
}

// ─── ⑥ 옷밑 살 클리핑 (Hide_Body) — 마킹 채널 합의 후 ─────────────────────────
// glTF 엔 '버텍스 그룹' 개념이 없다 → 외주 마킹을 어떤 채널로 받을지 미확정
//   (별도 morph / 별도 머티리얼 분리 / 숨김 인덱스 attribute 중 택1). 합의 후 구현.
// 지금 추측 구현하면 ASSET_SPEC 과 어긋날 위험 → 의도적으로 비워 둔다.
