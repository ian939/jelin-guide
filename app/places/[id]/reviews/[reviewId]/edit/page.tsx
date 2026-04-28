import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { ReviewForm } from '@/components/ReviewForm'
import { prisma } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function EditReviewPage({
  params,
}: {
  params: { id: string; reviewId: string }
}) {
  const user = await getSessionUser()
  if (!user) redirect(`/login?callbackUrl=/places/${params.id}`)
  const review = await prisma.review.findUnique({ where: { id: params.reviewId } })
  if (!review) notFound()
  if (review.authorId !== user.id) redirect(`/places/${params.id}`)
  return (
    <>
      <Header title="리뷰 수정" back={`/places/${params.id}`} />
      <main className="px-5 py-6">
        <ReviewForm
          placeId={params.id}
          reviewId={review.id}
          initial={{
            scoreTaste: review.scoreTaste,
            scoreValue: review.scoreValue,
            scoreAtmosphere: review.scoreAtmosphere,
            body: review.body,
          }}
        />
      </main>
    </>
  )
}
