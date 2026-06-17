import { Suspense, useCallback, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { AvatarComposer } from './AvatarComposer'
import { CatalogPicker } from './ui/CatalogPicker'
import { CATALOG, PartCategory, PartStatus, Selection, defaultSelection } from './constants'

// 에셋 조립 씬 — 좌측 VRoid식 카탈로그 피커(탭+그리드), 우측 3D + 접이식 dev 드로어.
const MORPHS = ['happy', 'angry', 'sad', 'surprised', 'aa', 'oh'] as const

export function ComposerScene() {
  const [selection, setSelection] = useState<Selection>(defaultSelection)
  const [eyeColor, setEyeColor] = useState<string | null>(null)
  const [partStatus, setPartStatus] = useState<Record<string, PartStatus>>(
    () => Object.fromEntries(CATALOG.map((c) => [c.id, 'idle'])),
  )

  // dev 드로어(스캐폴딩 격리)
  const [devOpen, setDevOpen] = useState(false)
  const [hair, setHair] = useState(false)
  const [shirt, setShirt] = useState(false)
  const [morph, setMorph] = useState(0)
  const [morphName, setMorphName] = useState<string>('happy')
  const [wave, setWave] = useState(false)
  const [report, setReport] = useState<string[]>([])

  const onSelect = useCallback(
    (cat: PartCategory, variantId: string | null) => setSelection((s) => ({ ...s, [cat]: variantId })),
    [],
  )
  const onPartStatus = useCallback(
    (id: string, status: PartStatus) => setPartStatus((s) => ({ ...s, [id]: status })),
    [],
  )

  return (
    <div className="flex w-full h-full bg-gray-950 text-gray-100">
      {/* 좌측: 카탈로그 피커 */}
      <div className="w-72 shrink-0 border-r border-gray-800 bg-gray-900">
        <CatalogPicker
          selection={selection}
          status={partStatus}
          onSelect={onSelect}
          eyeColor={eyeColor}
          onEyeColor={setEyeColor}
        />
      </div>

      {/* 우측: 3D + dev 드로어 */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 1.3, 1.5], fov: 35 }}>
          <ambientLight intensity={1.0} />
          <directionalLight position={[1, 2, 2]} intensity={1.3} />
          <Suspense fallback={null}>
            <AvatarComposer
              hair={hair} shirt={shirt} morph={morph} morphName={morphName} wave={wave}
              selection={selection} eyeColor={eyeColor} onReport={setReport} onPartStatus={onPartStatus}
            />
          </Suspense>
          <OrbitControls makeDefault target={[0, 1.2, 0]} minDistance={0.4} maxDistance={5} />
        </Canvas>

        <button
          onClick={() => setDevOpen((v) => !v)}
          className="absolute top-3 right-3 px-2.5 py-1 rounded text-[11px] bg-gray-800/80 text-gray-300 hover:bg-gray-700"
        >
          {devOpen ? 'dev ✕' : 'dev ▸'}
        </button>

        {devOpen && (
          <div className="absolute top-12 right-3 w-64 max-h-[80%] overflow-y-auto rounded-lg border border-gray-800 bg-gray-900/95 backdrop-blur p-3 flex flex-col gap-3">
            <p className="text-[10px] text-gray-500">검증/스캐폴딩 — 통합 시 폐기(INTEGRATION)</p>
            <div className="flex flex-col gap-2">
              <Toggle label="① 헤어 (리지드 부착)" on={hair} onClick={() => setHair((v) => !v)} />
              <Toggle label="② 셔츠 쉘 (스킨드 rebind)" on={shirt} onClick={() => setShirt((v) => !v)} />
              <Toggle label="팔/머리 흔들기 (추종 검증)" on={wave} onClick={() => setWave((v) => !v)} accent="emerald" />
            </div>
            <div className="flex flex-col gap-2 border-t border-gray-800 pt-3">
              <span className="text-xs text-gray-400">③ face 모프 슬라이더</span>
              <div className="grid grid-cols-3 gap-1">
                {MORPHS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMorphName(m)}
                    className={`text-xs py-1 rounded ${
                      morphName === m ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input type="range" min={0} max={1} step={0.01} value={morph}
                onChange={(e) => setMorph(parseFloat(e.target.value))} className="w-full" />
              <span className="text-xs text-gray-500 text-right">{morph.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-800 pt-3">
              <span className="text-xs text-gray-400">검증 리포트</span>
              <ul className="mt-1 flex flex-col gap-1">
                {report.length === 0 && <li className="text-xs text-gray-600">로딩 중…</li>}
                {report.map((r, i) => <li key={i} className="text-[11px] leading-snug text-gray-300">{r}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Toggle({ label, on, onClick, accent = 'amber' }: {
  label: string; on: boolean; onClick: () => void; accent?: 'amber' | 'emerald'
}) {
  const onBg = accent === 'emerald' ? 'bg-emerald-600' : 'bg-amber-600'
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
        on ? `${onBg} text-white` : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      <span>{label}</span>
      <span>{on ? '● ON' : '○ OFF'}</span>
    </button>
  )
}
