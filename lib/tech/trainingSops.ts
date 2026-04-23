import type { SopCategory } from '@/types/enums'

export type TrainingBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'p'; text: string }

export interface TrainingDocument {
  id: string
  title: string
  category: SopCategory
  /** Short line under the title on the list screen. */
  blurb: string
  blocks: TrainingBlock[]
}

export const TRAINING_DOCUMENTS: TrainingDocument[] = [
  {
    id: 'pre-job-safety',
    title: 'Pre-Job Safety Checklist',
    category: 'safety',
    blurb: 'Before every job — tools, PPE, lifting, emergencies.',
    blocks: [
      { type: 'h2', text: 'Before Every Job' },
      {
        type: 'ul',
        items: [
          'Inspect your tools — ensure all tools are in working condition.',
          'Check vehicle equipment — jack, lug wrench, torque wrench must be present.',
          'Wear proper PPE — safety glasses, gloves, steel-toe boots.',
          'Inspect work area — look for hazards; ensure the vehicle is on level ground.',
          'Chock the wheels — always chock opposite wheels before lifting.',
        ],
      },
      { type: 'h2', text: 'Lifting Safety' },
      {
        type: 'ul',
        items: [
          'Only use approved jack points.',
          'Never work under a vehicle supported only by a jack.',
          'Use jack stands as backup.',
          'Maximum lift height: 18 inches.',
        ],
      },
      { type: 'h2', text: 'Emergency Procedures' },
      {
        type: 'ul',
        items: [
          'Keep first aid kit accessible.',
          'Report any injuries immediately.',
          'Know the location of the nearest hospital.',
        ],
      },
    ],
  },
  {
    id: 'job-completion',
    title: 'Job Completion Procedure',
    category: 'procedures',
    blurb: 'Step-by-step from log-in to photos and payment.',
    blocks: [
      { type: 'h2', text: 'Step-by-Step Process' },
      {
        type: 'ul',
        items: [
          'Log the job BEFORE arrival — enter all customer info in the app.',
          "Take BEFORE photo — document vehicle condition before work begins.",
          "Update status to On the Way — this notifies the customer.",
          "Mark Arrived when you reach the location.",
          'Take DURING photo — document work in progress.',
          'Complete the service — follow all safety protocols.',
          'Take AFTER photo — document completed work.',
          'Collect payment — record payment type and amount.',
          "Mark job Completed — all 3 photos required.",
        ],
      },
      { type: 'h2', text: 'Important Notes' },
      {
        type: 'ul',
        items: [
          'ALL THREE photos are REQUIRED to complete a job.',
          'Always torque lug nuts to manufacturer specs.',
          'Clean up the work area before leaving.',
          'Thank the customer and remind them about our review link.',
        ],
      },
    ],
  },
  {
    id: 'customer-service',
    title: 'Customer Service Guidelines',
    category: 'customer_service',
    blurb: 'Greeting, during service, completion, and complaints.',
    blocks: [
      { type: 'h2', text: 'Greeting' },
      {
        type: 'ul',
        items: [
          'Introduce yourself by name.',
          'Confirm the service requested.',
          'Provide estimated completion time.',
        ],
      },
      { type: 'h2', text: 'During Service' },
      {
        type: 'ul',
        items: [
          'Keep the customer informed of progress.',
          'Explain any additional issues found.',
          'Get approval before any additional work.',
        ],
      },
      { type: 'h2', text: 'Completion' },
      {
        type: 'ul',
        items: [
          'Walk the customer through the work performed.',
          'Explain warranty and guarantees.',
          'Collect payment professionally.',
          'Thank them and mention our Google review.',
        ],
      },
      { type: 'h2', text: 'Handling Complaints' },
      {
        type: 'ul',
        items: [
          'Stay calm and professional.',
          'Listen actively.',
          'Escalate to management if needed.',
          'Document the issue in job notes.',
        ],
      },
    ],
  },
]

const CATEGORY_ORDER: SopCategory[] = ['safety', 'procedures', 'customer_service']

export function sortTrainingDocuments(docs: TrainingDocument[]): TrainingDocument[] {
  return [...docs].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  )
}

export function documentMatchesQuery(doc: TrainingDocument, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const hay = `${doc.title} ${doc.blurb} ${doc.blocks.map(blockText).join(' ')}`.toLowerCase()
  return hay.includes(needle)
}

function blockText(b: TrainingBlock): string {
  switch (b.type) {
    case 'h2':
    case 'h3':
    case 'p':
      return b.text
    case 'ul':
      return b.items.join(' ')
    default:
      return ''
  }
}
