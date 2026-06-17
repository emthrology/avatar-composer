import { useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { VRMLoaderPlugin, VRM, VRMUtils, VRMHumanBoneName } from '@pixiv/three-vrm'
import * as THREE from 'three'
import { BASE_URL, MODULE_PARTS, PartStatus } from './constants'
import { makeHairCap, makeShirtShell, attachHair, disposeObject } from './dummyParts'
import { loadPart, loadSpringPart, loadFacePart, LoadedPart, LoadedSpringPart, LoadedFacePart } from './partLoader'

type AnyLoadedPart = LoadedPart | LoadedSpringPart | LoadedFacePart

interface Props {
  hair: boolean
  shirt: boolean
  morph: number
  morphName: string
  wave: boolean
  partsVisible: Record<string, boolean>
  eyeColor: string | null
  onReport: (lines: string[]) => void
  onPartStatus: (id: string, status: PartStatus) => void
}

export function AvatarComposer({ hair, shirt, morph, morphName, wave, partsVisible, eyeColor, onReport, onPartStatus }: Props) {
  const vrmRef = useRef<VRM | null>(null)
  const hairRef = useRef<THREE.Object3D | null>(null)
  const shirtRef = useRef<THREE.SkinnedMesh | null>(null)
  const partsRef = useRef<Map<string, AnyLoadedPart>>(new Map())
  const faceRef = useRef<LoadedFacePart | null>(null)
  // drei식 유휴 시선(정책 — 통합 시 drei 구현으로 교체): 정면 한 점을 범위 내에서 랜덤 드리프트
  const gazeRef = useRef({ target: new THREE.Object3D(), cur: new THREE.Vector2(), goal: new THREE.Vector2(), t: 0 })
  const waveRef = useRef(wave)
  waveRef.current = wave
  const partsVisibleRef = useRef(partsVisible)
  partsVisibleRef.current = partsVisible
  const eyeColorRef = useRef(eyeColor)
  eyeColorRef.current = eyeColor

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gltf = useGLTF(BASE_URL, true, true, (loader: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loader.register((parser: any) => new VRMLoaderPlugin(parser as any))
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vrm: VRM | undefined = (gltf as any).userData?.vrm

  useEffect(() => {
    if (!vrm) return
    vrmRef.current = vrm
    VRMUtils.rotateVRM0(vrm)

    const report: string[] = []

    // ① 리지드 부착
    const cap = makeHairCap()
    if (attachHair(vrm, cap)) {
      hairRef.current = cap
      report.push('① 리지드 부착: head 본에 헤어 ✅')
    } else {
      report.push('① 리지드 부착: head 원시 본 없음 ❌')
    }

    // ② 스킨드 rebind
    const shell = makeShirtShell(vrm)
    if (shell) {
      vrm.scene.add(shell)
      shirtRef.current = shell
      report.push(`② 스킨드 rebind: 새 SkinnedMesh bind() ✅ (본 ${shell.skeleton.bones.length})`)
    } else {
      report.push('② 스킨드 rebind: 소스 SkinnedMesh 없음 ❌')
    }

    // ③ 모프
    const names = vrm.expressionManager?.expressions?.map((e) => e.expressionName) ?? []
    report.push(`③ 모프: expression ${names.length}종`)

    // ④⑤ 모듈 파츠 레지스트리 순회 — 부위별 독립 로드·장착
    let cancelled = false
    onReport([...report])
    MODULE_PARTS.forEach((part) => {
      onPartStatus(part.id, 'loading')
      const load =
        part.kind === 'spring' ? loadSpringPart : part.kind === 'face' ? loadFacePart : loadPart
      load(part.url, vrm)
        .then((loaded) => {
          if (cancelled) { loaded.dispose(); return }
          partsRef.current.set(part.id, loaded)
          if (part.kind === 'face') {
            faceRef.current = loaded as LoadedFacePart
            faceRef.current.setEyeColor(eyeColorRef.current) // 현재 눈색 반영
          }
          loaded.setVisible(partsVisibleRef.current[part.id] ?? true) // 현재 토글 반영
          const miss = loaded.missingBones
          report.push(
            miss.length
              ? `[${part.id}] ${part.label} 장착 ✅ but 누락 본 ${miss.length} ⚠️ (${miss.slice(0, 3).join(', ')}) — ASSET_SPEC §1`
              : `[${part.id}] ${part.label} 장착 ✅ (${part.kind})`,
          )
          onReport([...report])
          onPartStatus(part.id, 'loaded')
        })
        .catch((err) => {
          if (cancelled) return
          report.push(`[${part.id}] ${part.label} 실패 ❌ (${String(err).slice(0, 50)})`)
          onReport([...report])
          onPartStatus(part.id, 'error')
        })
    })

    return () => {
      cancelled = true
      partsRef.current.forEach((p) => p.dispose())
      partsRef.current.clear()
      faceRef.current = null
      if (hairRef.current) { hairRef.current.removeFromParent(); disposeObject(hairRef.current); hairRef.current = null }
      if (shirtRef.current) { shirtRef.current.removeFromParent(); disposeObject(shirtRef.current); shirtRef.current = null }
      VRMUtils.deepDispose(vrm.scene)
    }
  }, [vrm, onReport, onPartStatus])

  useEffect(() => { if (hairRef.current) hairRef.current.visible = hair }, [hair])
  useEffect(() => { if (shirtRef.current) shirtRef.current.visible = shirt }, [shirt])

  // 모듈 파츠 가시성 토글 (디버그 패널 → 로드된 실제 파츠)
  useEffect(() => {
    MODULE_PARTS.forEach((part) => partsRef.current.get(part.id)?.setVisible(partsVisible[part.id] ?? true))
  }, [partsVisible])

  useEffect(() => { faceRef.current?.setEyeColor(eyeColor) }, [eyeColor])

  useEffect(() => {
    const v = vrmRef.current
    if (!v?.expressionManager) return
    v.expressionManager.expressions.forEach((e) => v.expressionManager!.setValue(e.expressionName, 0))
    v.expressionManager.setValue(morphName, morph)
  }, [morph, morphName])

  useFrame((_, delta) => {
    const v = vrmRef.current
    if (!v) return
    // 유휴 시선: 정면(+Z) ~1m 앞 한 점을 ±19°/±10° 범위에서 1.4~3.8s마다 새 목표로 랜덤 드리프트(easing).
    // base lookAt(bone)이 base 눈 본을 돌리고, 교체 얼굴 눈은 loadFacePart.sync()가 미러로 추종.
    const gz = gazeRef.current
    if (v.lookAt && v.lookAt.target !== gz.target) v.lookAt.target = gz.target
    gz.t -= delta
    if (gz.t <= 0) {
      gz.t = 1.4 + Math.random() * 2.4
      gz.goal.set((Math.random() * 2 - 1) * 0.35, (Math.random() * 2 - 1) * 0.18)
    }
    gz.cur.lerp(gz.goal, Math.min(1, delta * 2.5))
    const headBone = v.humanoid.getRawBoneNode(VRMHumanBoneName.Head)
    if (headBone) {
      headBone.getWorldPosition(gz.target.position)
      gz.target.position.x += gz.cur.x
      gz.target.position.y += gz.cur.y
      gz.target.position.z += 1.0
      gz.target.updateMatrixWorld()
    }
    const armL = v.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)
    const armR = v.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
    const head = v.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head)
    if (armR) armR.rotation.z = 1.3
    if (waveRef.current) {
      const t = performance.now() / 1000
      if (armL) armL.rotation.z = -1.3 + (Math.sin(t * 2.2) * 0.5 + 0.5) * 1.0
      if (head) head.rotation.y = Math.sin(t * 1.3) * 0.5
    } else {
      if (armL) armL.rotation.z = -1.3
      if (head) head.rotation.y = 0
    }
    v.update(delta)
    faceRef.current?.sync() // update 후: base 표정 influences + 눈 lookAt 회전 → 교체된 새 Face/눈 본 미러
  })

  if (!vrm) return null
  return <primitive object={vrm.scene} />
}
