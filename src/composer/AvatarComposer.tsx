import { useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { VRMLoaderPlugin, VRM, VRMUtils, VRMHumanBoneName } from '@pixiv/three-vrm'
import * as THREE from 'three'
import { PartCategory, PartCategoryDef, PartStatus, Selection, VARIANTS_BY_ID } from './constants'
import { makeHairCap, makeShirtShell, attachHair, disposeObject } from './dummyParts'
import { loadPart, loadSpringPart, loadFacePart, LoadedPart, LoadedSpringPart, LoadedFacePart } from './partLoader'

type AnyLoadedPart = LoadedPart | LoadedSpringPart | LoadedFacePart
interface Slot { variantId: string; loaded: AnyLoadedPart }

interface Props {
  baseUrl: string
  catalog: PartCategoryDef[]
  hair: boolean
  shirt: boolean
  morph: number
  morphName: string
  wave: boolean
  selection: Selection
  eyeColor: string | null
  onReport: (lines: string[]) => void
  onPartStatus: (id: string, status: PartStatus) => void
}

export function AvatarComposer({ baseUrl, catalog, hair, shirt, morph, morphName, wave, selection, eyeColor, onReport, onPartStatus }: Props) {
  const vrmRef = useRef<VRM | null>(null)
  const hairRef = useRef<THREE.Object3D | null>(null)
  const shirtRef = useRef<THREE.SkinnedMesh | null>(null)
  // 카테고리 슬롯: 슬롯당 1개 active. genRef 는 async 로드 레이스(빠른 연속 선택) 가드.
  const slotsRef = useRef<Map<PartCategory, Slot>>(new Map())
  const genRef = useRef<Map<PartCategory, number>>(new Map())
  const faceRef = useRef<LoadedFacePart | null>(null)
  // drei식 유휴 시선(정책 — 통합 시 drei 구현으로 교체): 정면 한 점을 범위 내에서 랜덤 드리프트
  const gazeRef = useRef({ target: new THREE.Object3D(), cur: new THREE.Vector2(), goal: new THREE.Vector2(), t: 0 })
  const waveRef = useRef(wave)
  waveRef.current = wave
  const eyeColorRef = useRef(eyeColor)
  eyeColorRef.current = eyeColor

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gltf = useGLTF(baseUrl, true, true, (loader: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loader.register((parser: any) => new VRMLoaderPlugin(parser as any))
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vrm: VRM | undefined = (gltf as any).userData?.vrm

  // ─── 베이스 로드 + 더미 ①②③ (스캐폴딩, dev 드로어) ──────────────────────────
  useEffect(() => {
    if (!vrm) return
    vrmRef.current = vrm
    VRMUtils.rotateVRM0(vrm)

    const report: string[] = []
    const cap = makeHairCap()
    report.push(attachHair(vrm, cap) ? (hairRef.current = cap, '① 리지드 부착: head 본에 헤어 ✅') : '① 리지드 부착: head 원시 본 없음 ❌')
    const shell = makeShirtShell(vrm)
    if (shell) { vrm.scene.add(shell); shirtRef.current = shell; report.push(`② 스킨드 rebind: 새 SkinnedMesh bind() ✅ (본 ${shell.skeleton.bones.length})`) }
    else report.push('② 스킨드 rebind: 소스 SkinnedMesh 없음 ❌')
    const names = vrm.expressionManager?.expressions?.map((e) => e.expressionName) ?? []
    report.push(`③ 모프: expression ${names.length}종`)
    report.push('④ 모듈 파츠: 슬롯 선택으로 조립(카탈로그 피커)')
    onReport(report)

    return () => {
      slotsRef.current.forEach((s) => s.loaded.dispose())
      slotsRef.current.clear()
      faceRef.current = null
      if (hairRef.current) { hairRef.current.removeFromParent(); disposeObject(hairRef.current); hairRef.current = null }
      if (shirtRef.current) { shirtRef.current.removeFromParent(); disposeObject(shirtRef.current); shirtRef.current = null }
      VRMUtils.deepDispose(vrm.scene)
      // deepDispose 가 drei useGLTF 캐시 씬을 파괴 → 캐시에서 드롭해 재진입(base 스위치) 시 새로 로드.
      // (대안: base 미폐기로 즉시 재스위치 캐싱 — 스위치 빈번해지면 그쪽으로. 지금은 정합성 우선.)
      useGLTF.clear(baseUrl)
    }
  }, [vrm, onReport, baseUrl])

  // ─── 슬롯 선택·교체 엔진 ────────────────────────────────────────────────────
  // 카테고리별 desired(selection) vs 현재 슬롯 diff → 다르면 기존 dispose 후 새 변형 load.
  // null 이면 슬롯 비움. genRef 토큰으로 늦게 끝난 이전 로드를 폐기(레이스 차단).
  useEffect(() => {
    const base = vrmRef.current
    if (!base) return
    const apply = async (cat: PartCategory, desired: string | null) => {
      const slot = slotsRef.current.get(cat)
      if ((slot?.variantId ?? null) === desired) return
      const gen = (genRef.current.get(cat) ?? 0) + 1
      genRef.current.set(cat, gen)
      if (slot) {
        slot.loaded.dispose()
        slotsRef.current.delete(cat)
        if (cat === 'face') faceRef.current = null
      }
      if (!desired) { onPartStatus(cat, 'idle'); return }
      const resolved = VARIANTS_BY_ID.get(desired)
      if (!resolved) { onPartStatus(cat, 'error'); return }
      onPartStatus(cat, 'loading')
      const load = resolved.kind === 'spring' ? loadSpringPart : resolved.kind === 'face' ? loadFacePart : loadPart
      try {
        const loaded = await load(resolved.variant.url, base)
        if (genRef.current.get(cat) !== gen) { loaded.dispose(); return } // 더 새 선택이 들어옴
        slotsRef.current.set(cat, { variantId: desired, loaded })
        if (cat === 'face') { faceRef.current = loaded as LoadedFacePart; faceRef.current.setEyeColor(eyeColorRef.current) }
        loaded.setVisible(true)
        if (loaded.missingBones.length) console.warn(`[${cat}] 누락 본 ${loaded.missingBones.length}:`, loaded.missingBones.slice(0, 3))
        onPartStatus(cat, 'loaded')
      } catch (err) {
        if (genRef.current.get(cat) !== gen) return
        console.error(`[${cat}] 로드 실패`, err)
        onPartStatus(cat, 'error')
      }
    }
    catalog.forEach((c) => apply(c.id, selection[c.id] ?? null))
  }, [vrm, selection, onPartStatus, catalog])

  useEffect(() => { if (hairRef.current) hairRef.current.visible = hair }, [hair])
  useEffect(() => { if (shirtRef.current) shirtRef.current.visible = shirt }, [shirt])
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
