import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /*
   * `next build` and `next dev` both write to `.next` by default, so running a
   * build while a dev server is up deletes the chunks that server is still
   * serving — the browser then requests hashes that no longer exist and every
   * page 500s until the dev server is restarted.
   *
   * Setting NEXT_DIST_DIR gives one-off builds and verification runs their own
   * output directory, so they can never clobber a running dev server:
   *
   *   NEXT_DIST_DIR=.next-verify npx next build
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',
}

export default nextConfig
