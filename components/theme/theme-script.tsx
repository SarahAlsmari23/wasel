import { THEME_STORAGE_KEY } from '@/lib/theme/constants'

/**
 * Applies the stored theme before the browser paints, so a dark-mode user never
 * sees a white flash on first load. Runs synchronously in <head>; keeping it
 * tiny and dependency-free is the whole point.
 */
const BOOTSTRAP = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var dark =
      stored === 'dark' ||
      ((stored === 'system' || !stored) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP }} suppressHydrationWarning />
}
