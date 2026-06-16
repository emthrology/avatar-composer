import { useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { VRMLoaderPlugin, VRM, VRMUtils, VRMHumanBoneName } from '@pixiv/three-vrm'
import * as THREE from 'three'
import { BASE_URL, PART_TEST_URL, SPRING_PART_TEST_URL, PartStatus } from './constants'
import { makeHairCap, makeShirtShell, attachHair, disposeObject } from './dummyParts'
import { loadPart, loadSpringPart, LoadedPart, LoadedSpringPart } from './partLoader'

interface Props {
  hair: boolean
  shirt: boolean
  morph: number
  morphName: string
  wave: boolean
  partsVisible: Record<string, boolean>
  onReport: (lines: string[]) => void
  onPartStatus: (id: string, status: PartStatus) => void
}

export function AvatarComposer({ hair, shirt, morph, morphName, wave, partsVisible, onReport, onPartStatus }: Props) {
  const vrmRef = useRef<VRM | null>(null)
  const hairRef = useRef<THREE.Object3D | null>(null)
  const shirtRef = useRef<THREE.SkinnedMesh | null>(null)
  const partRef = useRef<LoadedPart | null>(null)
  const springPartRef = useRef<LoadedSpringPart | null>(null)
  const waveRef = useRef(wave)
  waveRef.current = wave
  const partsVisibleRef = useRef(partsVisible)
  partsVisibleRef.current = partsVisible

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

    // ④ 외부 authored GLB 파츠 로딩 + base 스켈레톤 rebind (PART_TEST_URL 설정 시에만)
    let cancelled = false
    if (!PART_TEST_URL) {
      report.push('④ 외부 GLB: 테스트 파츠 없음 (PART_TEST_URL 미설정)')
      onReport([...report])
      onPartStatus('tops', 'missing')
    } else {
      report.push('④ 외부 GLB: 로딩 중…')
      onReport([...report])
      onPartStatus('tops', 'loading')
      loadPart(PART_TEST_URL, vrm)
        .then((part) => {
          if (cancelled) { part.dispose(); return }
          partRef.current = part
          part.skinned.forEach((m) => { m.visible = partsVisibleRef.current.tops }) // 현재 토글 반영
          const miss = part.missingBones
          if (part.skinned.length > 0) {
            report[report.length - 1] = miss.length
              ? `④ 외부 GLB: rebind ✅ but 누락 본 ${miss.length}개 ⚠️ (${miss.slice(0, 3).join(', ')}…) — ASSET_SPEC §1 위반`
              : `④ 외부 GLB: 스킨드 ${part.skinned.length}메시 base 스켈레톤 rebind ✅`
          } else {
            report[report.length - 1] = `④ 외부 GLB: 리지드 파츠 ${part.rigid.length}개 head 부착 ✅`
          }
          onReport([...report])
          onPartStatus('tops', 'loaded')
        })
        .catch((err) => {
          if (cancelled) return
          report[report.length - 1] = `④ 외부 GLB: 로딩 실패 ❌ (${String(err).slice(0, 60)})`
          onReport([...report])
          onPartStatus('tops', 'error')
        })
    }

    // ⑤ 스프링 헤어 VRM 로딩 + 본 이식 + 스프링 병합 (SPRING_PART_TEST_URL 설정 시에만)
    if (!SPRING_PART_TEST_URL) {
      report.push('⑤ 스프링 헤어: 테스트 파츠 없음 (미설정)')
      onReport([...report])
      onPartStatus('hair', 'missing')
    } else {
      const idx = report.push('⑤ 스프링 헤어: 로딩 중…') - 1
      onReport([...report])
      onPartStatus('hair', 'loading')
      loadSpringPart(SPRING_PART_TEST_URL, vrm)
        .then((sp) => {
          if (cancelled) { sp.dispose(); return }
          springPartRef.current = sp
          if (sp.mesh) sp.mesh.visible = partsVisibleRef.current.hair // 현재 토글 반영
          const miss = sp.missingBones
          report[idx] = miss.length
            ? `⑤ 스프링 헤어: 본 이식 ${sp.graftedBones.length}·스프링 ${sp.mergedJoints} 병합 ✅ but 누락 ${miss.length} ⚠️`
            : `⑤ 스프링 헤어: 본 이식 ${sp.graftedBones.length}개 + 스프링 조인트 ${sp.mergedJoints}개 base 병합 ✅`
          onReport([...report])
          onPartStatus('hair', 'loaded')
        })
        .catch((err) => {
          if (cancelled) return
          report[idx] = `⑤ 스프링 헤어: 실패 ❌ (${String(err).slice(0, 60)})`
          onReport([...report])
          onPartStatus('hair', 'error')
        })
    }

    return () => {
      cancelled = true
      if (springPartRef.current) { springPartRef.current.dispose(); springPartRef.current = null }
      if (partRef.current) { partRef.current.dispose(); partRef.current = null }
      if (hairRef.current) { hairRef.current.removeFromParent(); disposeObject(hairRef.current); hairRef.current = null }
      if (shirtRef.current) { shirtRef.current.removeFromParent(); disposeObject(shirtRef.current); shirtRef.current = null }
      VRMUtils.deepDispose(vrm.scene)
    }
  }, [vrm, onReport, onPartStatus])

  useEffect(() => { if (hairRef.current) hairRef.current.visible = hair }, [hair])
  useEffect(() => { if (shirtRef.current) shirtRef.current.visible = shirt }, [shirt])

  // 모듈 파츠 가시성 토글 (디버그 패널 → 로드된 실제 파츠)
  useEffect(() => {
    partRef.current?.skinned.forEach((m) => { m.visible = partsVisible.tops })
    if (springPartRef.current?.mesh) springPartRef.current.mesh.visible = partsVisible.hair
  }, [partsVisible])

  useEffect(() => {
    const v = vrmRef.current
    if (!v?.expressionManager) return
    v.expressionManager.expressions.forEach((e) => v.expressionManager!.setValue(e.expressionName, 0))
    v.expressionManager.setValue(morphName, morph)
  }, [morph, morphName])

  useFrame((_, delta) => {
    const v = vrmRef.current
    if (!v) return
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
  })

  if (!vrm) return null
  return <primitive object={vrm.scene} />
}
