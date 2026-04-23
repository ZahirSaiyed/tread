'use client'

import { useParams } from 'next/navigation'
import { TechJobDetail } from '@/components/tech/TechJobDetail'

export default function TechJobDetailPage() {
  const params = useParams()
  const raw = params.id
  const id = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined
  if (!id) return null
  return <TechJobDetail jobId={id} />
}
