import { OperatorJobDetail } from '@/components/operator/OperatorJobDetail'

export default function OperatorJobDetailPage({ params }: { params: { id: string } }) {
  return <OperatorJobDetail jobId={params.id} />
}
