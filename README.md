This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Product milestones (TRS PRD)

Submilestones marked **done** in this repo as of the latest `main`:

- [x] **SM 2.1** — Tech dashboard (`/jobs`): metrics, filters, search, pull-to-refresh, realtime, job cards.
- [x] **SM 2.2** — Job detail (`/jobs/[id]`): full context, one-tap status flow, maps/call, cancel, `job_events` with `from`/`to`.
- [x] **SM 2.3** — Photo gate: private `job-photos` storage, three required types before **Complete**, signed URLs on job GET.
- [x] **SM 2.4** — Training & SOPs (`/training`): mobile list + detail, search, static tech-facing procedures (operator authoring / DB-backed SOPs deferred).

Ops: after schema changes run `npx supabase db push`. Local demo jobs: `POST /api/dev/seed-jobs` (development only) or the **Load demo jobs** control on an empty `/jobs` screen.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
