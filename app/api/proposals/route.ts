import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { proposalSchema } from '@/lib/validators/proposal'

// 사용자 자유 의견을 Google Apps Script Web App webhook으로 forward.
// 운영자가 발급한 webhook URL을 PROPOSAL_WEBHOOK_URL 환경변수에 설정해야 동작.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = proposalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const webhookUrl = process.env.PROPOSAL_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json(
      {
        error: 'WEBHOOK_NOT_CONFIGURED',
        message:
          '운영자가 아직 의견 수집 채널을 셋업하지 않았어요. 잠시 후 다시 시도해주세요.',
      },
      { status: 503 }
    )
  }

  const user = await getSessionUser()
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    ''

  const payload = {
    title: parsed.data.title,
    body: parsed.data.body,
    category: parsed.data.category,
    nickname: user?.nickname ?? '익명',
    ip,
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      // Apps Script는 redirect로 응답할 수 있어 manual로 따라가지 않음
      redirect: 'follow',
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: 'WEBHOOK_FAILED', status: res.status },
        { status: 502 }
      )
    }
  } catch (e) {
    return NextResponse.json(
      { error: 'WEBHOOK_FAILED', message: (e as Error).message },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
