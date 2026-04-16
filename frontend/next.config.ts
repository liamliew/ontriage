import type { NextConfig } from 'next'
import path from 'path'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      three: './node_modules/three',
      postprocessing: './node_modules/postprocessing',
      gsap: './node_modules/gsap',
    },
  },
}

export default withSentryConfig(nextConfig, {
  org: 'lf-creative-development',
  project: 'ontriage-frontend',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
})
