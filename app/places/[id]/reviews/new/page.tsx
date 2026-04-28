import { Header } from '@/components/Header'
import { ReviewForm } from '@/components/ReviewForm'

export default function NewReviewPage({ params }: { params: { id: string } }) {
  return (
    <>
      <Header title="리뷰 쓰기" back={`/places/${params.id}`} />
      <main className="px-5 py-6">
        <ReviewForm placeId={params.id} />
      </main>
    </>
  )
}
