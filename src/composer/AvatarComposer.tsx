import { useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { VRMLoaderPlugin, VRM, VRMUtils, VRMHumanBoneName } from '@pixiv/three-vrm'
import * as THREE from 'three'
import { BASE_URL } from './constants'
import { makeHairCap, makeShirtShell, attachHair, disposeObject } from './dummyParts'

interface Props {
  hair: boolean
  shirt: boolean
  morph: number
  morphName: string
  wave: boolean
  onReport: (lines: string[]) => void
}

export function AvatarComposer({ hair, shirt, morph, morphName, wave, onReport }: Props) {
  const vrmRef = useRef<VRM | null>(null)
  const hairRef = useRef<THREE.Object3D | null>(null)
  const shirtRef = useRef<THREE.SkinnedMesh | null>(null)
  const waveRef = useRef(wave)
  waveRef.current = wave

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

    onReport(report)

    return () => {
      if (hairRef.current) { hairRef.current.removeFromParent(); disposeObject(hairRef.current); hairRef.current = null }
      if (shirtRef.current) { shirtRef.current.removeFromParent(); disposeObject(shirtRef.current); shirtRef.current = null }
      VRMUtils.deepDispose(vrm.scene)
    }
  }, [vrm, onReport])

  useEffect(() => { if (hairRef.current) hairRef.current.visible = hair }, [hair])
  useEffect(() => { if (shirtRef.current) shirtRef.current.visible = shirt }, [shirt])

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
