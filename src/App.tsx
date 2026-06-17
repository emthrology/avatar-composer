import { ComposerScene } from './composer/ComposerScene'
import { ThumbScene } from './composer/ui/ThumbScene'
import { CATALOG, PartCategory } from './composer/constants'

// 썸네일 렌더 모드: ?thumb=<category>:<variantId> → 파츠 1개만 단독 렌더(오프라인 툴링).
// 카탈로그를 window 에 노출 → scripts/renderThumbs.mjs 가 변형 목록을 읽어 순회.
;(window as unknown as { __CATALOG?: typeof CATALOG }).__CATALOG = CATALOG

function parseThumb(): { category: PartCategory; variantId: string } | null {
  const raw = new URLSearchParams(window.location.search).get('thumb')
  if (!raw) return null
  const [category, variantId] = raw.split(':')
  if (!CATALOG.some((c) => c.id === category)) return null
  return { category: category as PartCategory, variantId }
}

export default function App() {
  const thumb = parseThumb()
  // 썸네일 모드는 배경 투명(omitBackground 스냅샷). 일반 모드만 어두운 배경.
  return (
    <div className={`w-full h-full ${thumb ? '' : 'bg-gray-950'}`}>
      {thumb ? <ThumbScene category={thumb.category} variantId={thumb.variantId} /> : <ComposerScene />}
    </div>
  )
}
