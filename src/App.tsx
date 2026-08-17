import { useState, useEffect, lazy, Suspense, ReactNode } from 'react'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { routeForFile, queueForRoute } from './lib/openWith'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ToastProvider } from './components/Toast'
import Navbar from './components/Navbar'
import CommandPalette from './components/CommandPalette'
import ToolSwitcher from './components/ToolSwitcher'
import SessionBar from './components/SessionBar'
import UpdateBanner from './components/UpdateBanner'
import ErrorBoundary from './components/ErrorBoundary'

// Home stays PERSISTENTLY mounted (hidden with display, not unmounted) so
// returning to it is instant — no re-render of the 60+ motion cards, no flicker,
// scroll position kept. Tool pages render in an absolutely-positioned overlay on
// top with a compositor-cheap opacity fade (no transform → no jank on the heavy
// grid). Going back just fades the overlay out, revealing the live Home beneath.
function MainArea({ home, children }: { home: ReactNode; children: ReactNode }) {
  const location = useLocation()
  const onHome = location.pathname === '/'
  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flex: 1, display: onHome ? 'flex' : 'none', flexDirection: 'column', minHeight: 0 }}>
        {home}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {!onHome && (
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } }}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg)' }}
          >
            {/* Every tool page is code-split; one boundary here covers them all
                so no single tool's bundle sits in the initial download. The
                error boundary is keyed by route, so a crash clears on navigate. */}
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={null}>
                <Routes location={location}>
                  {children}
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
import Home from './pages/Home'
const About = lazy(() => import('./pages/About'))
const TimeTracker = lazy(() => import('./pages/TimeTracker'))
const Settings = lazy(() => import('./pages/Settings'))
const JsonFormatter = lazy(() => import('./pages/JsonFormatter'))
const JsonXml = lazy(() => import('./pages/JsonXml'))
const Base64 = lazy(() => import('./pages/Base64'))
const UrlEncoder = lazy(() => import('./pages/UrlEncoder'))
const JwtDecoder = lazy(() => import('./pages/JwtDecoder'))
const HashGenerator = lazy(() => import('./pages/HashGenerator'))
const PasswordGenerator = lazy(() => import('./pages/PasswordGenerator'))
const ImageCompressor = lazy(() => import('./pages/ImageCompressor'))
const MediaCompressor = lazy(() => import('./pages/MediaCompressor'))
const VideoToGif = lazy(() => import('./pages/VideoToGif'))
const VideoEditor = lazy(() => import('./pages/VideoEditor'))
const QrGenerator = lazy(() => import('./pages/QrGenerator'))
const UuidGenerator = lazy(() => import('./pages/UuidGenerator'))
const WordCounter = lazy(() => import('./pages/WordCounter'))
const GlassmorphismBuilder = lazy(() => import('./pages/GlassmorphismBuilder'))
const KeyframeBuilder = lazy(() => import('./pages/KeyframeBuilder'))
const JsSandbox = lazy(() => import('./pages/JsSandbox'))
const TextCase = lazy(() => import('./pages/TextCase'))
const MarkdownPreview = lazy(() => import('./pages/MarkdownPreview'))
const RegexTester = lazy(() => import('./pages/RegexTester'))
// lazy: pulls in Monaco (~2MB) — keep it out of the main bundle
const DiffChecker = lazy(() => import('./pages/DiffChecker'))
const ColorConverter = lazy(() => import('./pages/ColorConverter'))
const UnixTimestamp = lazy(() => import('./pages/UnixTimestamp'))
const BaseConverter = lazy(() => import('./pages/BaseConverter'))
const CsvJson = lazy(() => import('./pages/CsvJson'))
const CronParser = lazy(() => import('./pages/CronParser'))
const LoremIpsum = lazy(() => import('./pages/LoremIpsum'))
const HtmlEntities = lazy(() => import('./pages/HtmlEntities'))
const ColorPalette = lazy(() => import('./pages/ColorPalette'))
const Slugify = lazy(() => import('./pages/Slugify'))
const YamlJson = lazy(() => import('./pages/YamlJson'))
const JsonTypeScript = lazy(() => import('./pages/JsonTypeScript'))
const SqlFormatter = lazy(() => import('./pages/SqlFormatter'))
const CsvViewer = lazy(() => import('./pages/CsvViewer'))
const MockDataGenerator = lazy(() => import('./pages/MockDataGenerator'))
const MetaTagGenerator = lazy(() => import('./pages/MetaTagGenerator'))
const LineSorter = lazy(() => import('./pages/LineSorter'))
const CurlBuilder = lazy(() => import('./pages/CurlBuilder'))
const HttpStatusCodes = lazy(() => import('./pages/HttpStatusCodes'))
const SemverChecker = lazy(() => import('./pages/SemverChecker'))
const ColorContrast = lazy(() => import('./pages/ColorContrast'))
const CssUnitConverter = lazy(() => import('./pages/CssUnitConverter'))
const GradientBuilder = lazy(() => import('./pages/GradientBuilder'))
const BoxShadowBuilder = lazy(() => import('./pages/BoxShadowBuilder'))
const ImageToBase64 = lazy(() => import('./pages/ImageToBase64'))
const Base64ToImage = lazy(() => import('./pages/Base64ToImage'))
const RestClient = lazy(() => import('./pages/RestClient'))
const FlexboxPlayground = lazy(() => import('./pages/FlexboxPlayground'))
const GridPlayground = lazy(() => import('./pages/GridPlayground'))
const SvgPreview = lazy(() => import('./pages/SvgPreview'))
const FaviconGenerator = lazy(() => import('./pages/FaviconGenerator'))
const ResponsiveTester = lazy(() => import('./pages/ResponsiveTester'))
const LogPrettifier = lazy(() => import('./pages/LogPrettifier'))
const NoSqlViewer = lazy(() => import('./pages/NoSqlViewer'))
const Notes = lazy(() => import('./pages/Notes'))
const ExifViewer = lazy(() => import('./pages/ExifViewer'))
const ColorBlindSimulator = lazy(() => import('./pages/ColorBlindSimulator'))
const ImageConverter = lazy(() => import('./pages/ImageConverter'))
const JwtGenerator = lazy(() => import('./pages/JwtGenerator'))
const BlurHashGenerator = lazy(() => import('./pages/BlurHashGenerator'))
const DarkLightConverter = lazy(() => import('./pages/DarkLightConverter'))
const TimezoneConverter = lazy(() => import('./pages/TimezoneConverter'))
const PomodoroTimer = lazy(() => import('./pages/PomodoroTimer'))
const HtmlPreview = lazy(() => import('./pages/HtmlPreview'))
const TomlJson = lazy(() => import('./pages/TomlJson'))
const JsonPathTester = lazy(() => import('./pages/JsonPathTester'))
const TextBinaryHex = lazy(() => import('./pages/TextBinaryHex'))

// Bridges the native macOS "Settings…" menu item to the in-app settings route.
function MenuBridge() {
  const navigate = useNavigate()
  useEffect(() => {
    if (!isTauri()) return
    let un: (() => void) | undefined
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen('menu:settings', () => navigate('/settings')).then(f => { un = f })
    })
    return () => un?.()
  }, [navigate])
  return null
}

// "Open with DevToolbox": route a file opened from Finder/Explorer to its tool.
function OpenWithBridge() {
  const navigate = useNavigate()
  useEffect(() => {
    if (!isTauri()) return
    const route = (paths: string[]) => {
      let target: string | undefined
      for (const p of paths) {
        const r = routeForFile(p)
        if (!r) continue
        queueForRoute(r, p)
        target ??= r
      }
      if (target) navigate(target)
    }
    let un: (() => void) | undefined
    // Files that arrived before React mounted (app launched by opening a file).
    invoke<string[]>('take_pending_files').then(route).catch(() => {})
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<string[]>('open-files', e => route(e.payload)).then(f => { un = f })
    })
    return () => un?.()
  }, [navigate])
  return null
}

export default function App() {
  // Persisted home state — survives navigation to tool pages and back
  const [homeSearch, setHomeSearch] = useState('')
  const [homeActiveCat, setHomeActiveCat] = useState('All')

  // Desktop: dismiss the splash window once React has mounted (min ~900ms so it
  // doesn't flash). The Rust side also has a 4s fallback in case this never runs.
  useEffect(() => {
    if (!isTauri()) return
    const t = setTimeout(() => { invoke('close_splashscreen').catch(() => {}) }, 900)
    return () => clearTimeout(t)
  }, [])

  return (
    <ToastProvider>
    <BrowserRouter>
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
      }}>
        <MenuBridge />
        <OpenWithBridge />
        <CommandPalette />
        <ToolSwitcher />
        <SessionBar />
        <UpdateBanner />
        <Navbar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MainArea home={
            <Home
              search={homeSearch}
              setSearch={setHomeSearch}
              activeCat={homeActiveCat}
              setActiveCat={setHomeActiveCat}
            />
          }>
            <Route path="/about" element={<About />} />
            <Route path="/time-tracker" element={<TimeTracker />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/json-formatter"      element={<JsonFormatter />} />
            <Route path="/json-xml"            element={<JsonXml />} />
            <Route path="/base64"              element={<Base64 />} />
            <Route path="/url-encoder"         element={<UrlEncoder />} />
            <Route path="/jwt-decoder"         element={<JwtDecoder />} />
            <Route path="/hash-generator"      element={<HashGenerator />} />
            <Route path="/password-generator"  element={<PasswordGenerator />} />
            <Route path="/image-compressor"    element={<ImageCompressor />} />
            <Route path="/media-compressor"    element={<MediaCompressor />} />
            <Route path="/video-to-gif"        element={<VideoToGif />} />
            <Route path="/video-editor"        element={<VideoEditor />} />
            <Route path="/qr-generator"        element={<QrGenerator />} />
            <Route path="/uuid-generator"      element={<UuidGenerator />} />
            <Route path="/word-counter"        element={<WordCounter />} />
            <Route path="/text-case"           element={<TextCase />} />
            <Route path="/markdown-preview"    element={<MarkdownPreview />} />
            <Route path="/regex-tester"        element={<RegexTester />} />
            <Route path="/diff-checker"        element={<DiffChecker />} />
            <Route path="/color-converter"     element={<ColorConverter />} />
            <Route path="/unix-timestamp"      element={<UnixTimestamp />} />
            <Route path="/base-converter"      element={<BaseConverter />} />
            <Route path="/csv-json"            element={<CsvJson />} />
            <Route path="/cron-parser"         element={<CronParser />} />
            <Route path="/lorem-ipsum"         element={<LoremIpsum />} />
            <Route path="/html-entities"       element={<HtmlEntities />} />
            <Route path="/color-palette"       element={<ColorPalette />} />
            <Route path="/slugify"             element={<Slugify />} />
            <Route path="/yaml-json"           element={<YamlJson />} />
            <Route path="/json-typescript"     element={<JsonTypeScript />} />
            <Route path="/sql-formatter"       element={<SqlFormatter />} />
            <Route path="/csv-viewer"          element={<CsvViewer />} />
            <Route path="/mock-data-generator" element={<MockDataGenerator />} />
            <Route path="/meta-tag-generator"  element={<MetaTagGenerator />} />
            <Route path="/line-sorter"         element={<LineSorter />} />
            <Route path="/curl-builder"        element={<CurlBuilder />} />
            <Route path="/http-status-codes"   element={<HttpStatusCodes />} />
            <Route path="/semver-checker"      element={<SemverChecker />} />
            <Route path="/color-contrast"      element={<ColorContrast />} />
            <Route path="/css-unit-converter"  element={<CssUnitConverter />} />
            <Route path="/gradient-builder"    element={<GradientBuilder />} />
            <Route path="/box-shadow-builder"  element={<BoxShadowBuilder />} />
            <Route path="/image-to-base64"     element={<ImageToBase64 />} />
            <Route path="/base64-to-image"     element={<Base64ToImage />} />
            <Route path="/rest-client"         element={<RestClient />} />
            <Route path="/flexbox-playground"  element={<FlexboxPlayground />} />
            <Route path="/grid-playground"     element={<GridPlayground />} />
            <Route path="/svg-preview"         element={<SvgPreview />} />
            <Route path="/favicon-generator"   element={<FaviconGenerator />} />
            <Route path="/responsive-tester"   element={<ResponsiveTester />} />
            <Route path="/glassmorphism-builder" element={<GlassmorphismBuilder />} />
            <Route path="/keyframe-builder"    element={<KeyframeBuilder />} />
            <Route path="/js-sandbox"          element={<JsSandbox />} />
            <Route path="/log-prettifier"      element={<LogPrettifier />} />
            <Route path="/nosql-viewer"        element={<NoSqlViewer />} />
            <Route path="/notes"               element={<Notes />} />
            <Route path="/exif-viewer"         element={<ExifViewer />} />
            <Route path="/color-blind-simulator" element={<ColorBlindSimulator />} />
            <Route path="/image-converter"       element={<ImageConverter />} />
            <Route path="/jwt-generator"         element={<JwtGenerator />} />
            <Route path="/blurhash-generator"  element={<BlurHashGenerator />} />
            <Route path="/dark-light-converter"  element={<DarkLightConverter />} />
            <Route path="/timezone-converter"    element={<TimezoneConverter />} />
            <Route path="/pomodoro"              element={<PomodoroTimer />} />
            <Route path="/html-preview"          element={<HtmlPreview />} />
            <Route path="/toml-json"             element={<TomlJson />} />
            <Route path="/json-path"             element={<JsonPathTester />} />
            <Route path="/text-binary"           element={<TextBinaryHex />} />
          </MainArea>
        </main>
      </div>
    </BrowserRouter>
    </ToastProvider>
  )
}
