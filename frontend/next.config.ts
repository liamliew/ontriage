import type { NextConfig } from 'next'
import path from 'path'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default withSentryConfig(nextConfig, {
  org: 'lf-creative-development',
  project: 'ontriage-frontend',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
})
