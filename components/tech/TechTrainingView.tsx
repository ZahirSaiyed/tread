'use client'

import { useMemo, useState } from 'react'
import {
  TRAINING_DOCUMENTS,
  documentMatchesQuery,
  sortTrainingDocuments,
  type TrainingBlock,
  type TrainingDocument,
} from '@/lib/tech/trainingSops'

const CATEGORY_LABEL: Record<TrainingDocument['category'], string> = {
  safety: 'Safety',
  procedures: 'Procedures',
  customer_service: 'Customer Service',
}

function categoryStyles(cat: TrainingDocument['category']): string {
  switch (cat) {
    case 'safety':
      return 'bg-[#FF3B30]/15 text-[#FF9F0A] ring-1 ring-[#FF3B30]/30'
    case 'procedures':
      return 'bg-status-onjob/15 text-status-onjob ring-1 ring-status-onjob/35'
    case 'customer_service':
      return 'bg-trs-gold/15 text-trs-gold ring-1 ring-trs-gold/30'
  }
}

function BlockView({ block }: { block: TrainingBlock }) {
  switch (block.type) {
    case 'h2':
      return (
        <h2 className="font-display text-lg font-semibold tracking-tight text-white mt-8 first:mt-0">
          {block.text}
        </h2>
      )
    case 'h3':
      return <h3 className="mt-4 text-base font-semibold text-white">{block.text}</h3>
    case 'p':
      return <p className="mt-3 text-base leading-relaxed text-[#E5E5EA]">{block.text}</p>
    case 'ul':
      return (
        <ul className="mt-3 space-y-2.5 pl-1">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-base leading-relaxed text-[#E5E5EA]">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-trs-gold" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
  }
}

export function TechTrainingView() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const openDoc = useMemo(
    () => TRAINING_DOCUMENTS.find((d) => d.id === openId) ?? null,
    [openId],
  )

  const filtered = useMemo(() => {
    const list = TRAINING_DOCUMENTS.filter((d) => documentMatchesQuery(d, query))
    return sortTrainingDocuments(list)
  }, [query])

  if (openDoc) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-white/[0.06] bg-black/90 px-4 pb-3 pt-2 backdrop-blur-md supports-[backdrop-filter]:bg-black/75">
          <button
            type="button"
            onClick={() => setOpenId(null)}
            className="min-h-touch -ml-1 rounded-lg px-2 text-sm font-medium text-trs-gold hover:text-trs-gold-dark"
          >
            ← Training
          </button>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[#8E8E93]">
            {CATEGORY_LABEL[openDoc.category]}
          </p>
          <h1 className="font-display mt-1 text-xl font-bold leading-tight text-white sm:text-2xl">
            {openDoc.title}
          </h1>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(7rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))] pt-4 [-webkit-overflow-scrolling:touch] touch-pan-y">
          {openDoc.blocks.map((b, i) => (
            <BlockView key={i} block={b} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-white/[0.06] bg-black/90 px-4 pb-4 pt-3 backdrop-blur-md supports-[backdrop-filter]:bg-black/75">
        <h1 className="font-display text-2xl font-bold text-white">Training &amp; SOPs</h1>
        <p className="mt-1 text-sm text-[#8E8E93]">Company procedures and training materials</p>
        <label className="sr-only" htmlFor="sop-search">
          Search procedures
        </label>
        <input
          id="sop-search"
          type="search"
          enterKeyHint="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-4 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-4 py-3 text-base text-white placeholder:text-[#48484A] focus:border-trs-gold focus:outline-none"
          autoComplete="off"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(7rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))] pt-3 [-webkit-overflow-scrolling:touch] touch-pan-y">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#8E8E93]">No matches. Try another search.</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(doc.id)}
                  className="w-full rounded-2xl border border-trs-slate bg-trs-charcoal p-4 text-left transition-colors hover:border-trs-gold/40 active:bg-trs-slate"
                >
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoryStyles(doc.category)}`}
                  >
                    {CATEGORY_LABEL[doc.category]}
                  </span>
                  <p className="mt-2 font-display text-lg font-semibold text-white">{doc.title}</p>
                  <p className="mt-1 text-sm leading-snug text-[#8E8E93]">{doc.blurb}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
