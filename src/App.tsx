import { useState, useEffect, lazy, Suspense, ReactNode } from 'react'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ToastProvider } from './components/Toast'
import Navbar from './components/Navbar'
import CommandPalette from './components/CommandPalette'
import ToolSwitcher from './components/ToolSwitcher'
import UpdateBanner from './components/UpdateBanner'

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
            <Routes location={location}>
              {children}
            </Routes>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
import Home from './pages/Home'
import About from './pages/About'
import Settings from './pages/Settings'
const JsonFormatter = lazy(() => import('./pages/JsonFormatter'))
import JsonXml from './pages/JsonXml'
import Base64 from './pages/Base64'
import UrlEncoder from './pages/UrlEncoder'
import JwtDecoder from './pages/JwtDecoder'
import HashGenerator from './pages/HashGenerator'
import PasswordGenerator from './pages/PasswordGenerator'
import ImageCompressor from './pages/ImageCompressor'
import MediaCompressor from './pages/MediaCompressor'
import VideoToGif from './pages/VideoToGif'
const VideoEditor = lazy(() => import('./pages/VideoEditor'))
const ScreenMirror = lazy(() => import('./pages/ScreenMirror'))
import QrGenerator from './pages/QrGenerator'
import UuidGenerator from './pages/UuidGenerator'
import WordCounter from './pages/WordCounter'
import GlassmorphismBuilder from './pages/GlassmorphismBuilder'
import KeyframeBuilder from './pages/KeyframeBuilder'
const JsSandbox = lazy(() => import('./pages/JsSandbox'))
import TextCase from './pages/TextCase'
import MarkdownPreview from './pages/MarkdownPreview'
import RegexTester from './pages/RegexTester'
// lazy: pulls in Monaco (~2MB) — keep it out of the main bundle
const DiffChecker = lazy(() => import('./pages/DiffChecker'))
import ColorConverter from './pages/ColorConverter'
import UnixTimestamp from './pages/UnixTimestamp'
import BaseConverter from './pages/BaseConverter'
import CsvJson from './pages/CsvJson'
import CronParser from './pages/CronParser'
import LoremIpsum from './pages/LoremIpsum'
import HtmlEntities from './pages/HtmlEntities'
import ColorPalette from './pages/ColorPalette'
import Slugify from './pages/Slugify'
import YamlJson from './pages/YamlJson'
import JsonTypeScript from './pages/JsonTypeScript'
import SqlFormatter from './pages/SqlFormatter'
import CsvViewer from './pages/CsvViewer'
import MockDataGenerator from './pages/MockDataGenerator'
import MetaTagGenerator from './pages/MetaTagGenerator'
import LineSorter from './pages/LineSorter'
import CurlBuilder from './pages/CurlBuilder'
import HttpStatusCodes from './pages/HttpStatusCodes'
import SemverChecker from './pages/SemverChecker'
import ColorContrast from './pages/ColorContrast'
import CssUnitConverter from './pages/CssUnitConverter'
import GradientBuilder from './pages/GradientBuilder'
import BoxShadowBuilder from './pages/BoxShadowBuilder'
import ImageToBase64 from './pages/ImageToBase64'
import Base64ToImage from './pages/Base64ToImage'
import RestClient from './pages/RestClient'
import FlexboxPlayground from './pages/FlexboxPlayground'
import GridPlayground from './pages/GridPlayground'
import SvgPreview from './pages/SvgPreview'
import FaviconGenerator from './pages/FaviconGenerator'
import ResponsiveTester from './pages/ResponsiveTester'
import LogPrettifier from './pages/LogPrettifier'
import NoSqlViewer from './pages/NoSqlViewer'
import Notes from './pages/Notes'
import ExifViewer from './pages/ExifViewer'
import ColorBlindSimulator from './pages/ColorBlindSimulator'
import ImageConverter from './pages/ImageConverter'
import JwtGenerator from './pages/JwtGenerator'
import BlurHashGenerator from './pages/BlurHashGenerator'
import DarkLightConverter from './pages/DarkLightConverter'
import TimezoneConverter from './pages/TimezoneConverter'
import PomodoroTimer from './pages/PomodoroTimer'
import HtmlPreview from './pages/HtmlPreview'
import TomlJson from './pages/TomlJson'
import JsonPathTester from './pages/JsonPathTester'
import TextBinaryHex from './pages/TextBinaryHex'

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
        <CommandPalette />
        <ToolSwitcher />
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
            <Route path="/settings" element={<Settings />} />
            <Route path="/json-formatter"      element={<Suspense fallback={null}><JsonFormatter /></Suspense>} />
            <Route path="/json-xml"            element={<JsonXml />} />
            <Route path="/base64"              element={<Base64 />} />
            <Route path="/url-encoder"         element={<UrlEncoder />} />
            <Route path="/jwt-decoder"         element={<JwtDecoder />} />
            <Route path="/hash-generator"      element={<HashGenerator />} />
            <Route path="/password-generator"  element={<PasswordGenerator />} />
            <Route path="/image-compressor"    element={<ImageCompressor />} />
            <Route path="/media-compressor"    element={<MediaCompressor />} />
            <Route path="/video-to-gif"        element={<VideoToGif />} />
            <Route path="/video-editor"        element={<Suspense fallback={null}><VideoEditor /></Suspense>} />
            <Route path="/screen-mirror"       element={<Suspense fallback={null}><ScreenMirror /></Suspense>} />
            <Route path="/qr-generator"        element={<QrGenerator />} />
            <Route path="/uuid-generator"      element={<UuidGenerator />} />
            <Route path="/word-counter"        element={<WordCounter />} />
            <Route path="/text-case"           element={<TextCase />} />
            <Route path="/markdown-preview"    element={<MarkdownPreview />} />
            <Route path="/regex-tester"        element={<RegexTester />} />
            <Route path="/diff-checker"        element={<Suspense fallback={null}><DiffChecker /></Suspense>} />
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
            <Route path="/js-sandbox"          element={<Suspense fallback={null}><JsSandbox /></Suspense>} />
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
