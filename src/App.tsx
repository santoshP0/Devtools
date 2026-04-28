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

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/json-formatter" element={<JsonFormatter />} />
            <Route path="/json-xml" element={<JsonXml />} />
            <Route path="/base64" element={<Base64 />} />
            <Route path="/url-encoder" element={<UrlEncoder />} />
            <Route path="/jwt-decoder" element={<JwtDecoder />} />
            <Route path="/hash-generator" element={<HashGenerator />} />
            <Route path="/password-generator" element={<PasswordGenerator />} />
            <Route path="/image-compressor" element={<ImageCompressor />} />
            <Route path="/qr-generator" element={<QrGenerator />} />
            <Route path="/uuid-generator" element={<UuidGenerator />} />
            <Route path="/word-counter" element={<WordCounter />} />
            <Route path="/text-case" element={<TextCase />} />
            <Route path="/markdown-preview" element={<MarkdownPreview />} />
            <Route path="/regex-tester" element={<RegexTester />} />
            <Route path="/diff-checker" element={<DiffChecker />} />
            <Route path="/color-converter" element={<ColorConverter />} />
            <Route path="/unix-timestamp" element={<UnixTimestamp />} />
            <Route path="/base-converter" element={<BaseConverter />} />
            <Route path="/csv-json" element={<CsvJson />} />
            <Route path="/cron-parser" element={<CronParser />} />
            <Route path="/lorem-ipsum" element={<LoremIpsum />} />
            <Route path="/html-entities" element={<HtmlEntities />} />
            <Route path="/color-palette" element={<ColorPalette />} />
            <Route path="/slugify" element={<Slugify />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
