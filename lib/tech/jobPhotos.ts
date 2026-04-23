import type { JobPhoto } from '@/types/domain'
import type { PhotoType } from '@/types/enums'

const REQUIRED: PhotoType[] = ['before', 'during', 'after']

/**
 * True when there is at least one photo row for each required completion type.
 */
export function hasCompletionPhotos(photos: Pick<JobPhoto, 'photo_type'>[]): boolean {
  const types = new Set(photos.map((p) => p.photo_type))
  return REQUIRED.every((t) => types.has(t))
}

export function missingPhotoTypes(photos: Pick<JobPhoto, 'photo_type'>[]): PhotoType[] {
  const types = new Set(photos.map((p) => p.photo_type))
  return REQUIRED.filter((t) => !types.has(t))
}
