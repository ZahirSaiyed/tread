import { describe, expect, it } from 'vitest'
import { getNextStatusAction } from '@/lib/tech/jobStatusCta'

describe('getNextStatusAction', () => {
  it('pending → assigned', () => {
    expect(getNextStatusAction('pending')).toEqual({ target: 'assigned', label: 'Accept job' })
  })

  it('assigned → en_route', () => {
    expect(getNextStatusAction('assigned')).toEqual({ target: 'en_route', label: 'Accept & roll' })
  })

  it('en_route → on_site', () => {
    expect(getNextStatusAction('en_route')).toEqual({ target: 'on_site', label: 'On site' })
  })

  it('on_site → complete', () => {
    expect(getNextStatusAction('on_site')).toEqual({ target: 'complete', label: 'Complete' })
  })

  it('returns null for terminal states', () => {
    expect(getNextStatusAction('complete')).toBeNull()
    expect(getNextStatusAction('cancelled')).toBeNull()
  })
})
