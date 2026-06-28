import EngineeringReviewDetailClient from './EngineeringReviewDetailClient';

export default function EngineeringReviewDetailPage({ params }: { params: { reviewId: string } }) {
  return <EngineeringReviewDetailClient reviewId={params.reviewId} />;
}
