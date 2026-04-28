import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import JsonFormatter from './pages/JsonFormatter'
import JsonXml from './pages/JsonXml'
import Base64 from './pages/Base64'
import UrlEncoder from './pages/UrlEncoder'
import JwtDecoder from './pages/JwtDecoder'
import HashGenerator from './pages/HashGenerator'
import PasswordGenerator from './pages/PasswordGenerator'
import ImageCompressor from './pages/ImageCompressor'
import QrGenerator from './pages/QrGenerator'
import UuidGenerator from './pages/UuidGenerator'
import WordCounter from './pages/WordCounter'
import TextCase from './pages/TextCase'
import MarkdownPreview from './pages/MarkdownPreview'
import RegexTester from './pages/RegexTester'
import DiffChecker from './pages/DiffChecker'
import ColorConverter from './pages/ColorConverter'
import UnixTimestamp from './pages/UnixTimestamp'
import BaseConverter from './pages/BaseConverter'
import CsvJson from './pages/CsvJson'
import CronParser from './pages/CronParser'
import LoremIpsum from './pages/LoremIpsum'
import HtmlEntities from './pages/HtmlEntities'
import ColorPalette from './pages/ColorPalette'
import Slugify from './pages/Slugify'
// New tools
import YamlJson from './pages/YamlJson'
import JsonTypeScript from './pages/JsonTypeScript'
import StringEscape from './pages/StringEscape'
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

export default function App() {
  // Persisted home state — survives navigation to tool pages and back
  const [homeSearch, setHomeSearch] = useState('')
  const [homeActiveCat, setHomeActiveCat] = useState('All')

  return (
    <BrowserRouter>
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
      }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={
              <Home
                search={homeSearch}
                setSearch={setHomeSearch}
                activeCat={homeActiveCat}
                setActiveCat={setHomeActiveCat}
              />
            } />
            {/* Existing tools */}
            <Route path="/json-formatter"   element={<JsonFormatter />} />
            <Route path="/json-xml"         element={<JsonXml />} />
            <Route path="/base64"           element={<Base64 />} />
            <Route path="/url-encoder"      element={<UrlEncoder />} />
            <Route path="/jwt-decoder"      element={<JwtDecoder />} />
            <Route path="/hash-generator"   element={<HashGenerator />} />
            <Route path="/password-generator" element={<PasswordGenerator />} />
            <Route path="/image-compressor" element={<ImageCompressor />} />
            <Route path="/qr-generator"     element={<QrGenerator />} />
            <Route path="/uuid-generator"   element={<UuidGenerator />} />
            <Route path="/word-counter"     element={<WordCounter />} />
            <Route path="/text-case"        element={<TextCase />} />
            <Route path="/markdown-preview" element={<MarkdownPreview />} />
            <Route path="/regex-tester"     element={<RegexTester />} />
            <Route path="/diff-checker"     element={<DiffChecker />} />
            <Route path="/color-converter"  element={<ColorConverter />} />
            <Route path="/unix-timestamp"   element={<UnixTimestamp />} />
            <Route path="/base-converter"   element={<BaseConverter />} />
            <Route path="/csv-json"         element={<CsvJson />} />
            <Route path="/cron-parser"      element={<CronParser />} />
            <Route path="/lorem-ipsum"      element={<LoremIpsum />} />
            <Route path="/html-entities"    element={<HtmlEntities />} />
            <Route path="/color-palette"    element={<ColorPalette />} />
            <Route path="/slugify"          element={<Slugify />} />
            {/* New tools */}
            <Route path="/yaml-json"         element={<YamlJson />} />
            <Route path="/json-typescript"   element={<JsonTypeScript />} />
            <Route path="/string-escape"     element={<StringEscape />} />
            <Route path="/sql-formatter"     element={<SqlFormatter />} />
            <Route path="/csv-viewer"        element={<CsvViewer />} />
            <Route path="/mock-data-generator" element={<MockDataGenerator />} />
            <Route path="/meta-tag-generator"  element={<MetaTagGenerator />} />
            <Route path="/line-sorter"       element={<LineSorter />} />
            <Route path="/curl-builder"      element={<CurlBuilder />} />
            <Route path="/http-status-codes" element={<HttpStatusCodes />} />
            <Route path="/semver-checker"    element={<SemverChecker />} />
            <Route path="/color-contrast"    element={<ColorContrast />} />
            <Route path="/css-unit-converter" element={<CssUnitConverter />} />
            <Route path="/gradient-builder"  element={<GradientBuilder />} />
            <Route path="/box-shadow-builder" element={<BoxShadowBuilder />} />
            <Route path="/image-to-base64"   element={<ImageToBase64 />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
