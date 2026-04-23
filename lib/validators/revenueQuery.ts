import { z } from 'zod'

const isoOrDate = z
  .string()
  .min(4)
  .refine(
    (s) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return true
      return !Number.isNaN(Date.parse(s))
    },
    { message: 'Invalid date' },
  )

export const RevenueQuerySchema = z
  .object({
    from: isoOrDate,
    to: isoOrDate,
  })
  .strict()
  .superRefine((val, ctx) => {
    const a = Date.parse(val.from.length === 10 ? `${val.from}T00:00:00.000Z` : val.from)
    const b = Date.parse(val.to.length === 10 ? `${val.to}T23:59:59.999Z` : val.to)
    if (!Number.isNaN(a) && !Number.isNaN(b) && a > b) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '`from` must be before or equal to `to`',
        path: ['to'],
      })
    }
  })

export function revenueRangeFromParams(searchParams: URLSearchParams): {
  ok: true
  fromIso: string
  toIso: string
} | { ok: false; error: string } {
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const parsed = RevenueQuerySchema.safeParse({ from, to })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid query' }
  }
  const v = parsed.data
  const fromIso =
    v.from.length === 10 ? `${v.from}T00:00:00.000Z` : new Date(v.from).toISOString()
  const toIso = v.to.length === 10 ? `${v.to}T23:59:59.999Z` : new Date(v.to).toISOString()
  return { ok: true, fromIso, toIso }
}
