import { describe, expect, it } from 'vitest'
import { hasCompletionPhotos, missingPhotoTypes } from '@/lib/tech/jobPhotos'
import type { JobPhoto } from '@/types/domain'

function p(type: JobPhoto['photo_type']): Pick<JobPhoto, 'photo_type'> {
  return { photo_type: type }
}

describe('hasCompletionPhotos', () => {
  it('returns false when empty', () => {
    expect(hasCompletionPhotos([])).toBe(false)
  })

  it('returns false with only one type', () => {
    expect(hasCompletionPhotos([p('before')])).toBe(false)
  })

  it('returns false with two types', () => {
    expect(hasCompletionPhotos([p('before'), p('during')])).toBe(false)
  })

  it('returns true with before, during, after', () => {
    expect(hasCompletionPhotos([p('before'), p('during'), p('after')])).toBe(true)
  })

  it('returns true when extras exist', () => {
    expect(hasCompletionPhotos([p('before'), p('during'), p('after'), p('before')])).toBe(true)
  })
})

describe('missingPhotoTypes', () => {
  it('lists all three when none', () => {
    expect(missingPhotoTypes([])).toEqual(['before', 'during', 'after'])
  })

  it('lists only missing', () => {
    expect(missingPhotoTypes([p('before')])).toEqual(['during', 'after'])
  })
})
