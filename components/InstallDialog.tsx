'use client'

import { useEffect, useState } from 'react'
import { detectPlatform, type Platform } from '@/lib/ua'
import { useInstallPrompt } from '@/lib/use-install-prompt'

/**
 * "홈 화면에 추가" 안내 모달.
 * - Android Chrome (canPrompt=true): 버튼 1탭으로 설치 prompt
 * - iOS Safari: 공유 → 홈 화면에 추가 시각 가이드
 * - 카카오톡 인앱: 외부 브라우저로 열기 안내
 * - 이미 standalone: "이미 추가됨" 안내
 */
export function InstallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { canPrompt, promptInstall } = useInstallPrompt()
  const [platform, setPlatform] = useState<Platform>({
    isIOS: false,
    isAndroid: false,
    isKakao: false,
    isStandalone: false,
  })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setPlatform(detectPlatform())
  }, [open])

  async function handleInstall() {
    setBusy(true)
    const result = await promptInstall()
    setBusy(false)
    if (result === 'accepted') onClose()
  }

  function openInExternalBrowser() {
    // 카톡 인앱 → 외부 브라우저 trick. 실패해도 사용자가 직접 안내 따르도록.
    const url = window.location.href
    if (platform.isAndroid) {
      window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
    } else {
      // iOS 카톡: 공유 → Safari로 열기를 직접 안내. 강제 전환 API 없음.
      alert('우측 상단 ··· → "다른 브라우저로 열기"를 눌러주세요.')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="mx-auto w-full max-w-mobile rounded-t-3xl bg-white p-5 pb-8"
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-zinc-200" />
        <h2 className="mb-1 text-lg font-bold">📲 홈 화면에 추가</h2>
        <p className="mb-4 text-xs leading-relaxed text-zinc-500">
          홈 화면에 학동위키 아이콘을 추가하면, 다음부터 한 번 탭으로 바로 들어올 수 있어요.
        </p>

        {platform.isStandalone ? (
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
            ✅ 이미 홈 화면에 추가되어 있어요.
          </div>
        ) : platform.isKakao ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              카카오톡에서는 홈 화면 추가가 안 돼요. 기본 브라우저(Chrome / Safari)로 열어주세요.
            </div>
            <button
              type="button"
              onClick={openInExternalBrowser}
              className="btn w-full"
            >
              다른 브라우저로 열기
            </button>
          </div>
        ) : platform.isIOS ? (
          <ol className="space-y-3 text-sm text-zinc-700">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                1
              </span>
              <span>
                Safari 하단의 <strong>공유 버튼</strong>{' '}
                <span className="inline-block rounded-md bg-zinc-100 px-1.5 py-0.5 text-zinc-700">
                  ⬆︎
                </span>
                을 누르세요.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                2
              </span>
              <span>
                메뉴를 내려서 <strong>홈 화면에 추가</strong>를 선택하세요.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                3
              </span>
              <span>
                우측 상단 <strong>추가</strong>를 누르면 끝!
              </span>
            </li>
          </ol>
        ) : canPrompt ? (
          <button
            type="button"
            onClick={handleInstall}
            disabled={busy}
            className="btn w-full"
          >
            {busy ? '설치 중…' : '📲 홈 화면에 추가하기'}
          </button>
        ) : (
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="mb-2 font-medium">Chrome 메뉴에서 추가할 수 있어요</p>
            <p className="text-zinc-600">
              우측 상단 <strong>⋮</strong> → <strong>홈 화면에 추가</strong> 또는{' '}
              <strong>앱 설치</strong>를 선택해주세요.
            </p>
          </div>
        )}

        <div className="mt-6">
          <button type="button" onClick={onClose} className="btn-secondary w-full">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
