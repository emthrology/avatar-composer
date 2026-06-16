import { MODULE_PARTS, PartStatus } from './constants'

// 좌측 디버그 오버레이 — 모듈 파츠 on/off. 로드 상태에 따라 토글 활성/비활성.
interface Props {
  visible: Record<string, boolean>
  status: Record<string, PartStatus>
  onToggle: (id: string) => void
}

const STATUS_TEXT: Record<PartStatus, { text: string; cls: string }> = {
  idle: { text: '대기', cls: 'text-gray-500' },
  loading: { text: '로딩…', cls: 'text-amber-400' },
  loaded: { text: '', cls: '' },
  missing: { text: '없음', cls: 'text-gray-600' },
  error: { text: '실패', cls: 'text-red-400' },
}

export function PartsPanel({ visible, status, onToggle }: Props) {
  return (
    <div className="absolute top-3 left-3 w-52 rounded-lg border border-gray-700 bg-gray-900/85 p-3 text-gray-100 shadow-xl backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span className="text-xs font-semibold text-amber-400">모듈 파츠</span>
        <span className="ml-auto text-[10px] text-gray-500">on/off</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {MODULE_PARTS.map((p) => {
          const st = status[p.id] ?? 'idle'
          const loaded = st === 'loaded'
          const on = visible[p.id]
          const badge = STATUS_TEXT[st]
          return (
            <button
              key={p.id}
              disabled={!loaded}
              onClick={() => onToggle(p.id)}
              className={`flex items-center justify-between rounded px-2.5 py-1.5 text-xs transition-colors ${
                !loaded
                  ? 'cursor-not-allowed bg-gray-800/50 text-gray-600'
                  : on
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span className="flex flex-col items-start leading-tight">
                <span>{p.label}</span>
                <span className="text-[10px] opacity-70">{p.detail}</span>
              </span>
              {loaded ? (
                <span className="text-[10px]">{on ? '● ON' : '○ OFF'}</span>
              ) : (
                <span className={`text-[10px] ${badge.cls}`}>{badge.text}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
