import { Suspense } from 'react'
import { OperatorJobsHub } from '@/components/operator/OperatorJobsHub'

export default function OperatorJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-[#8E8E93]">Loading…</div>
      }
    >
      <OperatorJobsHub />
    </Suspense>
  )
}
