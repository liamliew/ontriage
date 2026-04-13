import Link from 'next/link'
import { SignedIn, SignedOut } from '@clerk/nextjs'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-white tracking-tight">OnTriage</span>
          <nav className="flex items-center gap-6">
            <SignedOut>
              <Link
                href="/sign-in"
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="text-sm bg-white text-black px-3 py-1.5 rounded-md font-medium hover:bg-neutral-200 transition-colors"
              >
                Get started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="text-sm bg-white text-black px-3 py-1.5 rounded-md font-medium hover:bg-neutral-200 transition-colors"
              >
                Dashboard
              </Link>
            </SignedIn>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Real-time uptime monitoring
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
            Know when your services
            <br />
            <span className="text-neutral-400">go down — before users do</span>
          </h1>

          <p className="text-lg text-neutral-400 max-w-2xl mx-auto mb-10">
            OnTriage monitors your HTTP endpoints, TCP ports, and servers every minute.
            Get instant alerts, beautiful status pages, and full incident history.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="bg-white text-black px-5 py-2.5 rounded-md font-medium hover:bg-neutral-200 transition-colors text-sm"
            >
              Start monitoring free
            </Link>
            <Link
              href="/sign-in"
              className="text-sm text-neutral-400 hover:text-white transition-colors px-5 py-2.5"
            >
              Sign in →
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-neutral-800">
          <div className="max-w-6xl mx-auto px-6 py-20 grid sm:grid-cols-3 gap-8">
            <FeatureCard
              title="HTTP & TCP Monitoring"
              description="Monitor any endpoint with configurable check intervals. Detect outages in seconds."
            />
            <FeatureCard
              title="Instant Alerts"
              description="Get notified the moment something goes wrong via email, Slack, or webhook."
            />
            <FeatureCard
              title="Public Status Pages"
              description="Keep your users informed with branded status pages. Share uptime with a URL."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center">
          <p className="text-xs text-neutral-600">© {new Date().getFullYear()} OnTriage</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
      <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
    </div>
  )
}
