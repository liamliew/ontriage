import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'

export default async function StatusPagesPage() {
  // Status page management will be implemented once the backend API
  // exposes CRUD endpoints for status pages.
  const { userId } = await auth()

  if (!userId) return null

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Status Pages</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Public pages that show your service status
          </p>
        </div>
      </div>

      <div className="border border-neutral-800 rounded-xl p-12 text-center">
        <p className="text-sm text-neutral-500 mb-2">Status page management coming soon</p>
        <p className="text-xs text-neutral-600">
          Public status pages are available at{' '}
          <code className="text-neutral-400 font-mono">/status/[slug]</code>
        </p>
      </div>

      <div className="mt-8 p-4 rounded-lg border border-neutral-800 bg-neutral-900/40">
        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide mb-2">
          Example public status page
        </p>
        <Link
          href="/status/demo"
          className="text-sm text-neutral-300 hover:text-white transition-colors font-mono"
        >
          /status/demo →
        </Link>
      </div>
    </div>
  )
}
