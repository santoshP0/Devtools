import { useState, useCallback, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'
import { useClipboardCopy } from '../hooks/useClipboardCopy'

/* ── EXIF Tag Definitions ── */
const EXIF_TAGS: Record<number, string> = {
  0x010F: 'Make', 0x0110: 'Model', 0x0112: 'Orientation',
  0x011A: 'XResolution', 0x011B: 'YResolution', 0x0128: 'ResolutionUnit',
  0x0131: 'Software', 0x0132: 'DateTime', 0x013B: 'Artist',
  0x8769: 'ExifIFD', 0x8825: 'GPSIFD',
  // ExifIFD tags
  0x829A: 'ExposureTime', 0x829D: 'FNumber', 0x8822: 'ExposureProgram',
  0x8827: 'ISOSpeedRatings', 0x9000: 'ExifVersion', 0x9003: 'DateTimeOriginal',
  0x9004: 'DateTimeDigitized', 0x9201: 'ShutterSpeedValue', 0x9202: 'ApertureValue',
  0x9203: 'BrightnessValue', 0x9204: 'ExposureBiasValue', 0x9205: 'MaxApertureValue',
  0x9207: 'MeteringMode', 0x9208: 'LightSource', 0x9209: 'Flash',
  0x920A: 'FocalLength', 0xA002: 'PixelXDimension', 0xA003: 'PixelYDimension',
  0xA005: 'InteroperabilityIFD', 0xA20E: 'FocalPlaneXResolution',
  0xA20F: 'FocalPlaneYResolution', 0xA210: 'FocalPlaneResolutionUnit',
  0xA217: 'SensingMethod', 0xA300: 'FileSource', 0xA301: 'SceneType',
  0xA401: 'CustomRendered', 0xA402: 'ExposureMode', 0xA403: 'WhiteBalance',
  0xA404: 'DigitalZoomRatio', 0xA405: 'FocalLengthIn35mmFilm', 0xA406: 'SceneCaptureType',
  0xA407: 'GainControl', 0xA408: 'Contrast', 0xA409: 'Saturation', 0xA40A: 'Sharpness',
  // GPS tags
  0x0000: 'GPSVersionID', 0x0001: 'GPSLatitudeRef', 0x0002: 'GPSLatitude',
  0x0003: 'GPSLongitudeRef', 0x0004: 'GPSLongitude', 0x0005: 'GPSAltitudeRef',
  0x0006: 'GPSAltitude', 0x0007: 'GPSTimeStamp', 0x0012: 'GPSMapDatum',
  0x001D: 'GPSDateStamp',
}

const METERING_MODES: Record<number, string> = {
  0:'Unknown',1:'Average',2:'Center-weighted',3:'Spot',4:'Multi-spot',5:'Pattern',6:'Partial'
}
const EXPOSURE_PROGRAMS: Record<number, string> = {
  0:'Undefined',1:'Manual',2:'Program',3:'Aperture priority',4:'Shutter priority',5:'Creative',6:'Action',7:'Portrait',8:'Landscape'
}
const WHITE_BALANCE: Record<number, string> = { 0: 'Auto', 1: 'Manual' }
const FLASH_VALUES: Record<number, string> = {
  0:'No flash',1:'Flash fired',5:'Flash fired, no strobe',7:'Flash fired, strobe',9:'Flash fired, compulsory',
  13:'Flash fired, compulsory, no strobe',15:'Flash fired, compulsory, strobe',
  16:'No flash, compulsory',24:'No flash, auto',25:'Flash fired, auto',
  29:'Flash fired, auto, no strobe',31:'Flash fired, auto, strobe',
  32:'No flash function',65:'Flash fired, red-eye',
}

interface ImageTag {
  value: any
  label: string
  group: string
  removable: boolean
}

/* ── Binary Parser Helpers ── */
function readUint16(view: DataView, offset: number, le: boolean) {
  return view.getUint16(offset, le)
}
function readUint32(view: DataView, offset: number, le: boolean) {
  return view.getUint32(offset, le)
}
function readRational(view: DataView, offset: number, le: boolean): number {
  const num = view.getUint32(offset, le)
  const den = view.getUint32(offset + 4, le)
  return den === 0 ? 0 : num / den
}
function readSignedRational(view: DataView, offset: number, le: boolean): number {
  const num = view.getInt32(offset, le)
  const den = view.getInt32(offset + 4, le)
  return den === 0 ? 0 : num / den
}
function readAscii(view: DataView, offset: number, length: number): string {
  let s = ''
  for (let i = 0; i < length - 1; i++) {
    const c = view.getUint8(offset + i)
    if (c === 0) break
    s += String.fromCharCode(c)
  }
  return s.trim()
}

function parseIFD(view: DataView, ifdOffset: number, le: boolean, baseOffset = 0): Record<string, any> {
  const result: Record<string, any> = {}
  try {
    const count = readUint16(view, ifdOffset, le)
    for (let i = 0; i < count; i++) {
      const entryOffset = ifdOffset + 2 + i * 12
      if (entryOffset + 12 > view.byteLength) break
      const tag = readUint16(view, entryOffset, le)
      const type = readUint16(view, entryOffset + 2, le)
      const numValues = readUint32(view, entryOffset + 4, le)
      const valueOffset = readUint32(view, entryOffset + 8, le)

      const tagName = EXIF_TAGS[tag]
      if (!tagName) continue

      const TYPE_SIZES = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8]
      const typeSize = TYPE_SIZES[type] || 1
      const totalSize = typeSize * numValues
      const dataOffset = totalSize > 4 ? (baseOffset + valueOffset) : entryOffset + 8

      if (dataOffset + totalSize > view.byteLength) continue

      let value: any
      try {
        if (type === 2) { // ASCII
          value = readAscii(view, dataOffset, numValues)
        } else if (type === 5) { // RATIONAL
          if (numValues === 1) value = readRational(view, dataOffset, le)
          else value = Array.from({ length: numValues }, (_, j) => readRational(view, dataOffset + j * 8, le))
        } else if (type === 10) { // SRATIONAL
          if (numValues === 1) value = readSignedRational(view, dataOffset, le)
          else value = Array.from({ length: numValues }, (_, j) => readSignedRational(view, dataOffset + j * 8, le))
        } else if (type === 3) { // SHORT
          if (numValues === 1) value = readUint16(view, dataOffset, le)
          else value = Array.from({ length: Math.min(numValues, 8) }, (_, j) => readUint16(view, dataOffset + j * 2, le))
        } else if (type === 4) { // LONG
          if (numValues === 1) value = readUint32(view, dataOffset, le)
          else value = Array.from({ length: Math.min(numValues, 8) }, (_, j) => readUint32(view, dataOffset + j * 4, le))
        } else if (type === 1 || type === 7) { // BYTE/UNDEFINED
          value = view.getUint8(dataOffset)
        }
        result[tagName] = value
      } catch { /* skip malformed entry */ }
    }
  } catch { /* skip malformed IFD */ }
  return result
}

function parseTiffExif(view: DataView, tiffStart: number): Record<string, any> {
  const byteOrder = view.getUint16(tiffStart)
  const le = byteOrder === 0x4949
  if (byteOrder !== 0x4949 && byteOrder !== 0x4D4D) return {}
  const ifd0Offset = readUint32(view, tiffStart + 4, le)
  const ifd0 = parseIFD(view, tiffStart + ifd0Offset, le, tiffStart)
  if (ifd0['ExifIFD']) {
    Object.assign(ifd0, parseIFD(view, tiffStart + ifd0['ExifIFD'], le, tiffStart))
    delete ifd0['ExifIFD']
  }
  if (ifd0['GPSIFD']) {
    Object.assign(ifd0, parseIFD(view, tiffStart + ifd0['GPSIFD'], le, tiffStart))
    delete ifd0['GPSIFD']
  }
  return ifd0
}

function parseJpegExif(view: DataView): Record<string, any> {
  if (view.getUint16(0) !== 0xFFD8) return {}
  let offset = 2
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset)
    if (marker === 0xFFE1) {
      const segLen = view.getUint16(offset + 2)
      if (view.getUint32(offset + 4) !== 0x45786966) { offset += 2 + segLen; continue }
      return parseTiffExif(view, offset + 10)
    }
    if (marker === 0xFFDA) break
    if ((marker & 0xFF00) !== 0xFF00) break
    offset += 2 + view.getUint16(offset + 2)
  }
  return {}
}

function parseWebPExif(view: DataView): Record<string, any> {
  if (view.byteLength < 12) return {}
  const riff = view.getUint32(0)
  const webp = view.getUint32(8)
  if (riff !== 0x52494646 || webp !== 0x57454250) return {}
  let offset = 12
  while (offset < view.byteLength - 8) {
    const chunkId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1), view.getUint8(offset+2), view.getUint8(offset+3))
    const chunkSize = view.getUint32(offset + 4, true)
    if (chunkId === 'EXIF') {
      const exifStart = offset + 8
      const maybeExif = view.getUint32(exifStart)
      const tiffOffset = maybeExif === 0x45786966 ? exifStart + 6 : exifStart
      return parseTiffExif(view, tiffOffset)
    }
    offset += 8 + chunkSize + (chunkSize % 2)
  }
  return {}
}

function parsePngMetadata(buffer: ArrayBuffer): Record<string, any> {
  const view = new DataView(buffer)
  const result: Record<string, any> = {}
  
  if (view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) {
    return result
  }
  
  // Parse IHDR
  const ihdrLen = view.getUint32(8)
  const ihdrType = view.getUint32(12)
  if (ihdrType === 0x49484452) { // 'IHDR'
    result['Width'] = view.getUint32(16)
    result['Height'] = view.getUint32(20)
    result['BitDepth'] = view.getUint8(24)
    
    const colorType = view.getUint8(25)
    const colorTypeNames: Record<number, string> = {
      0: 'Grayscale',
      2: 'RGB',
      3: 'Indexed Color',
      4: 'Grayscale with Alpha',
      6: 'RGB with Alpha'
    }
    result['ColorType'] = colorTypeNames[colorType] || `Unknown (${colorType})`
    result['Compression'] = view.getUint8(26) === 0 ? 'Deflate/Inflate' : 'Unknown'
    result['Filter'] = view.getUint8(27) === 0 ? 'Adaptive' : 'Unknown'
    result['Interlace'] = view.getUint8(28) === 0 ? 'Noninterlaced' : 'Adam7 Interlaced'
  }
  
  let offset = 8 + 12 + ihdrLen
  const textDecoder = new TextDecoder('utf-8')
  
  while (offset < buffer.byteLength - 8) {
    const length = view.getUint32(offset)
    const typeBytes = new Uint8Array(buffer, offset + 4, 4)
    const type = String.fromCharCode(...typeBytes)
    const chunkDataOffset = offset + 8
    
    if (type === 'tEXt') {
      const data = new Uint8Array(buffer, chunkDataOffset, length)
      const nulIdx = data.indexOf(0)
      if (nulIdx > 0) {
        const key = textDecoder.decode(data.subarray(0, nulIdx))
        const val = textDecoder.decode(data.subarray(nulIdx + 1))
        result[key] = val
      }
    } else if (type === 'iTXt') {
      const data = new Uint8Array(buffer, chunkDataOffset, length)
      const nulIdx = data.indexOf(0)
      if (nulIdx > 0) {
        const key = textDecoder.decode(data.subarray(0, nulIdx))
        const compFlag = data[nulIdx + 1]
        let langIdx = nulIdx + 3
        while (langIdx < length && data[langIdx] !== 0) langIdx++
        let transIdx = langIdx + 1
        while (transIdx < length && data[transIdx] !== 0) transIdx++
        
        const textData = data.subarray(transIdx + 1)
        if (compFlag === 0) {
          const val = textDecoder.decode(textData)
          result[key] = val
        }
      }
    } else if (type === 'eXIf') {
      try {
        const exifData = parseTiffExif(view, chunkDataOffset)
        Object.assign(result, exifData)
      } catch {}
    }
    
    offset += 12 + length
  }
  
  return result
}

function parseJpegStructure(view: DataView): Record<string, any> {
  const result: Record<string, any> = {}
  if (view.getUint16(0) !== 0xFFD8) return result
  
  let offset = 2
  while (offset < view.byteLength - 4) {
    const marker = view.getUint16(offset)
    const length = view.getUint16(offset + 2)
    const isSOF = (marker >= 0xFFC0 && marker <= 0xFFC3) || (marker >= 0xFFC5 && marker <= 0xFFC7) || (marker >= 0xFFC9 && marker <= 0xFFCB) || (marker >= 0xFFCD && marker <= 0xFFCF)
    if (isSOF) {
      result['BitDepth'] = view.getUint8(offset + 4)
      result['Height'] = view.getUint16(offset + 5)
      result['Width'] = view.getUint16(offset + 7)
      
      const compNum = view.getUint8(offset + 9)
      const compNames: Record<number, string> = { 1: 'Grayscale', 3: 'YCbCr', 4: 'CMYK' }
      result['ColorComponents'] = compNames[compNum] || `Unknown (${compNum})`
      
      const typeNames: Record<number, string> = {
        0xFFC0: 'Baseline DCT',
        0xFFC1: 'Extended Sequential DCT',
        0xFFC2: 'Progressive DCT',
        0xFFC3: 'Lossless Sequential'
      }
      result['Compression'] = typeNames[marker] || 'JPEG Compression'
      break
    }
    offset += 2 + length
  }
  return result
}

function parseExif(buffer: ArrayBuffer): Record<string, any> {
  const view = new DataView(buffer)
  let result = parseJpegExif(view)
  if (Object.keys(result).length > 0) return result
  result = parseWebPExif(view)
  if (Object.keys(result).length > 0) return result
  const bo = view.getUint16(0)
  if (bo === 0x4949 || bo === 0x4D4D) {
    result = parseTiffExif(view, 0)
    if (Object.keys(result).length > 0) return result
  }
  return {}
}

/* ── Format helpers ── */
function fmtExposure(val: number): string {
  if (val >= 1) return `${val}s`
  return `1/${Math.round(1 / val)}s`
}
function fmtGPS(vals: number[], ref: string): string {
  if (!Array.isArray(vals) || vals.length < 3) return ''
  const deg = vals[0], min = vals[1], sec = vals[2]
  const decimal = deg + min / 60 + sec / 3600
  return `${decimal.toFixed(6)}° ${ref}`
}
function gpsToDecimal(vals: number[], ref: string): number {
  if (!Array.isArray(vals) || vals.length < 3) return 0
  const d = vals[0] + vals[1] / 60 + vals[2] / 3600
  return (ref === 'S' || ref === 'W') ? -d : d
}

const METADATA_SCHEMA: Record<string, { label: string; group: string; removable: boolean }> = {
  'FileName': { label: 'File Name', group: 'file', removable: false },
  'FileSize': { label: 'File Size', group: 'file', removable: false },
  'MimeType': { label: 'MIME Type', group: 'file', removable: false },
  'Width': { label: 'Image Width', group: 'structure', removable: false },
  'Height': { label: 'Image Height', group: 'structure', removable: false },
  'BitDepth': { label: 'Bit Depth', group: 'structure', removable: false },
  'ColorType': { label: 'Color Type', group: 'structure', removable: false },
  'ColorComponents': { label: 'Color Components', group: 'structure', removable: false },
  'Compression': { label: 'Compression', group: 'structure', removable: false },
  'Filter': { label: 'Filter', group: 'structure', removable: false },
  'Interlace': { label: 'Interlace', group: 'structure', removable: false },
  'PixelXDimension': { label: 'Pixel X Dimension', group: 'structure', removable: false },
  'PixelYDimension': { label: 'Pixel Y Dimension', group: 'structure', removable: false },
  'Orientation': { label: 'Orientation', group: 'structure', removable: true },
  'XResolution': { label: 'X Resolution', group: 'structure', removable: true },
  'YResolution': { label: 'Y Resolution', group: 'structure', removable: true },
  'ResolutionUnit': { label: 'Resolution Unit', group: 'structure', removable: true },
  'Make': { label: 'Camera Make', group: 'camera', removable: true },
  'Model': { label: 'Camera Model', group: 'camera', removable: true },
  'Software': { label: 'Software Used', group: 'camera', removable: true },
  'Artist': { label: 'Artist', group: 'camera', removable: true },
  'ExposureTime': { label: 'Exposure Time', group: 'exposure', removable: true },
  'FNumber': { label: 'F-Number (Aperture)', group: 'exposure', removable: true },
  'ISOSpeedRatings': { label: 'ISO Speed Rating', group: 'exposure', removable: true },
  'ShutterSpeedValue': { label: 'Shutter Speed', group: 'exposure', removable: true },
  'ApertureValue': { label: 'Aperture Value', group: 'exposure', removable: true },
  'ExposureBiasValue': { label: 'Exposure Bias', group: 'exposure', removable: true },
  'ExposureProgram': { label: 'Exposure Program', group: 'exposure', removable: true },
  'ExposureMode': { label: 'Exposure Mode', group: 'exposure', removable: true },
  'MeteringMode': { label: 'Metering Mode', group: 'exposure', removable: true },
  'Flash': { label: 'Flash Mode', group: 'exposure', removable: true },
  'WhiteBalance': { label: 'White Balance', group: 'exposure', removable: true },
  'FocalLength': { label: 'Focal Length', group: 'exposure', removable: true },
  'FocalLengthIn35mmFilm': { label: 'Focal Length (35mm Equiv)', group: 'exposure', removable: true },
  'DigitalZoomRatio': { label: 'Digital Zoom Ratio', group: 'exposure', removable: true },
  'DateTime': { label: 'Modify Date', group: 'date', removable: true },
  'DateTimeOriginal': { label: 'Creation Date', group: 'date', removable: true },
  'DateTimeDigitized': { label: 'Digitization Date', group: 'date', removable: true },
  'GPSLatitude': { label: 'Latitude', group: 'gps', removable: true },
  'GPSLatitudeRef': { label: 'Latitude Ref', group: 'gps', removable: true },
  'GPSLongitude': { label: 'Longitude', group: 'gps', removable: true },
  'GPSLongitudeRef': { label: 'Longitude Ref', group: 'gps', removable: true },
  'GPSAltitude': { label: 'Altitude', group: 'gps', removable: true },
  'GPSAltitudeRef': { label: 'Altitude Ref', group: 'gps', removable: true },
  'GPSDateStamp': { label: 'GPS Date Stamp', group: 'gps', removable: true },
  'GPSTimeStamp': { label: 'GPS Time Stamp', group: 'gps', removable: true },
  'GPSMapDatum': { label: 'GPS Map Datum', group: 'gps', removable: true },
}

const GROUP_INFOS = [
  { key: 'file', label: 'File Info', icon: '📝' },
  { key: 'structure', label: 'Image Structure', icon: '🖼️' },
  { key: 'camera', label: 'Camera & Software', icon: '📷' },
  { key: 'exposure', label: 'Exposure & Capture', icon: '⚡' },
  { key: 'date', label: 'Date & Time', icon: '🕐' },
  { key: 'gps', label: 'GPS Location', icon: '📍' },
  { key: 'other', label: 'Other Metadata', icon: '🏷️' },
]

function compileTags(rawTags: Record<string, any>, file: File): Record<string, ImageTag> {
  const result: Record<string, ImageTag> = {}
  result['FileName'] = { value: file.name, label: 'File Name', group: 'file', removable: false }
  result['FileSize'] = { value: file.size, label: 'File Size', group: 'file', removable: false }
  result['MimeType'] = { value: file.type || 'image/unknown', label: 'MIME Type', group: 'file', removable: false }

  for (const [key, rawValue] of Object.entries(rawTags)) {
    const schema = METADATA_SCHEMA[key]
    if (schema) {
      result[key] = {
        value: rawValue,
        label: schema.label,
        group: schema.group,
        removable: schema.removable
      }
    } else {
      result[key] = {
        value: rawValue,
        label: key,
        group: 'other',
        removable: true
      }
    }
  }
  return result
}

function formatValue(tag: string, raw: any): string {
  if (raw === undefined || raw === null || raw === '') return '—'
  if (tag === 'ExposureTime') return fmtExposure(raw as number)
  if (tag === 'FNumber') return `f/${(raw as number).toFixed(1)}`
  if (tag === 'FocalLength' || tag === 'FocalLengthIn35mmFilm') return `${Math.round(raw as number)}mm`
  if (tag === 'ExposureBiasValue') return `${(raw as number).toFixed(1)} EV`
  if (tag === 'DigitalZoomRatio') return `${(raw as number).toFixed(1)}×`
  if (tag === 'MeteringMode') return METERING_MODES[raw as number] ?? String(raw)
  if (tag === 'ExposureProgram') return EXPOSURE_PROGRAMS[raw as number] ?? String(raw)
  if (tag === 'WhiteBalance') return WHITE_BALANCE[raw as number] ?? String(raw)
  if (tag === 'Flash') return FLASH_VALUES[raw as number] ?? String(raw)
  if (tag === 'GPSLatitude') return fmtGPS(raw, '')
  if (tag === 'GPSLongitude') return fmtGPS(raw, '')
  if (tag === 'GPSAltitude') return `${(raw as number).toFixed(1)} m`
  if (Array.isArray(raw)) return raw.map(v => typeof v === 'number' ? v.toFixed(2) : String(v)).join(', ')
  if (typeof raw === 'number') return Number.isInteger(raw) ? String(raw) : raw.toFixed(3)
  return String(raw)
}

/* ── Lossless Metadata Stripper functions ── */

function stripJpegMetadata(buffer: ArrayBuffer): Blob {
  const view = new DataView(buffer)
  if (view.getUint16(0) !== 0xFFD8) {
    return new Blob([buffer], { type: 'image/jpeg' })
  }
  
  const chunks: ArrayBuffer[] = []
  chunks.push(new Uint8Array([0xFF, 0xD8]).buffer)
  
  let offset = 2
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset)
    if (marker === 0xFFDA) { // Start of Scan
      chunks.push(buffer.slice(offset))
      break
    }
    if ((marker & 0xFF00) !== 0xFF00) break
    const segLen = view.getUint16(offset + 2)
    const isMetadata = marker === 0xFFE1 || marker === 0xFFE2 || marker === 0xFFED || marker === 0xFFFE
    if (!isMetadata) {
      chunks.push(buffer.slice(offset, offset + 2 + segLen))
    }
    offset += 2 + segLen
  }
  return new Blob(chunks, { type: 'image/jpeg' })
}

function stripPngMetadata(buffer: ArrayBuffer): Blob {
  const view = new DataView(buffer)
  if (view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) {
    return new Blob([buffer], { type: 'image/png' })
  }
  
  const chunks: ArrayBuffer[] = []
  chunks.push(buffer.slice(0, 8)) // Push PNG signature
  
  let offset = 8
  while (offset < buffer.byteLength - 8) {
    const length = view.getUint32(offset)
    const typeBytes = new Uint8Array(buffer, offset + 4, 4)
    const type = String.fromCharCode(...typeBytes)
    
    const metadataChunks = ['tEXt', 'zTXt', 'iTXt', 'iCCP', 'eXIf', 'tIME', 'gAMA', 'cHRM']
    const chunkTotalLength = 12 + length
    
    if (!metadataChunks.includes(type)) {
      chunks.push(buffer.slice(offset, offset + chunkTotalLength))
    }
    offset += chunkTotalLength
  }
  return new Blob(chunks, { type: 'image/png' })
}

function stripWebpMetadata(buffer: ArrayBuffer): Blob {
  const view = new DataView(buffer)
  if (view.getUint32(0) !== 0x52494646 || view.getUint32(8) !== 0x57454250) {
    return new Blob([buffer], { type: 'image/webp' })
  }
  
  const outputChunks: ArrayBuffer[] = []
  let offset = 12
  
  while (offset < buffer.byteLength - 8) {
    const chunkIdBytes = new Uint8Array(buffer, offset, 4)
    const chunkId = String.fromCharCode(...chunkIdBytes)
    const chunkSize = view.getUint32(offset + 4, true)
    const chunkTotalLength = 8 + chunkSize + (chunkSize % 2)
    
    if (chunkId === 'EXIF' || chunkId === 'ICCP' || chunkId === 'XMP ') {
      // skip metadata chunks
    } else if (chunkId === 'VP8X') {
      const chunkData = new Uint8Array(buffer.slice(offset, offset + chunkTotalLength))
      chunkData[8] = chunkData[8] & ~0x2C
      outputChunks.push(chunkData.buffer)
    } else {
      outputChunks.push(buffer.slice(offset, offset + chunkTotalLength))
    }
    offset += chunkTotalLength
  }
  
  let totalPayloadSize = 4
  for (const chunk of outputChunks) {
    totalPayloadSize += chunk.byteLength
  }
  
  const headerBuffer = new ArrayBuffer(12)
  const headerView = new DataView(headerBuffer)
  headerView.setUint32(0, 0x52494646)
  headerView.setUint32(4, totalPayloadSize, true)
  headerView.setUint32(8, 0x57454250)
  
  return new Blob([headerBuffer, ...outputChunks], { type: 'image/webp' })
}

function stripExifViaCanvas(imgSrc: string, outputType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('No canvas context'))
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      }, outputType, 0.95)
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = imgSrc
  })
}

/* ── Component ── */
export default function ExifViewer() {
  const [tags, setTags] = useState<Record<string, ImageTag>>({})
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [imgNaturalW, setImgNaturalW] = useState(0)
  const [imgNaturalH, setImgNaturalH] = useState(0)
  const { copied: copiedJson, copy: copyJson } = useClipboardCopy()
  const bufferRef = useRef<ArrayBuffer | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback((file: File) => {
    setFileName(file.name)
    setFileSize(file.size)
    const reader = new FileReader()
    reader.onload = e => {
      const buf = e.target?.result as ArrayBuffer
      bufferRef.current = buf
      
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      let rawTags: Record<string, any> = {}
      
      if (ext === 'png') {
        rawTags = parsePngMetadata(buf)
      } else {
        const parsedExif = parseExif(buf)
        Object.assign(rawTags, parsedExif)
        
        if (ext === 'jpg' || ext === 'jpeg') {
          const jpegStructure = parseJpegStructure(new DataView(buf))
          Object.assign(rawTags, jpegStructure)
        }
      }
      
      const compiled = compileTags(rawTags, file)
      setTags(compiled)
      
      const url = URL.createObjectURL(file)
      setImgSrc(prev => { if (prev) URL.revokeObjectURL(prev); return url })
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) loadFile(f)
  }, [loadFile])

  const hasFile = !!imgSrc
  const hasGPS = tags['GPSLatitude']?.value && tags['GPSLongitude']?.value
  const lat = hasGPS ? gpsToDecimal(tags['GPSLatitude'].value, tags['GPSLatitudeRef']?.value) : 0
  const lng = hasGPS ? gpsToDecimal(tags['GPSLongitude'].value, tags['GPSLongitudeRef']?.value) : 0

  const handleStripExif = async () => {
    if (!imgSrc || !bufferRef.current) return
    try {
      const ext = fileName.split('.').pop()?.toLowerCase() || 'png'
      let blob: Blob | null = null

      if (ext === 'jpg' || ext === 'jpeg') {
        blob = stripJpegMetadata(bufferRef.current)
      } else if (ext === 'png') {
        blob = stripPngMetadata(bufferRef.current)
      } else if (ext === 'webp') {
        blob = stripWebpMetadata(bufferRef.current)
      }

      if (!blob) {
        const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', bmp: 'image/bmp' }
        const outputMime = mimeMap[ext] || 'image/png'
        blob = await stripExifViaCanvas(imgSrc, outputMime)
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const finalExt = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png'
      a.href = url; a.download = `${fileName.replace(/\.[^.]+$/, '')}_clean.${finalExt}`; a.click()
      URL.revokeObjectURL(url)
    } catch { /* silent */ }
  }

  const handleCopyJson = () => {
    const simplified: Record<string, any> = {}
    for (const [key, tag] of Object.entries(tags)) {
      simplified[key] = tag.value
    }
    copyJson(JSON.stringify(simplified, null, 2))
  }

  const fmtSize = (b: number) => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`

  const removableCount = Object.values(tags).filter(t => t.removable).length

  return (
    <ToolLayout title="EXIF Viewer" description="Extract and inspect image metadata — camera settings, GPS location, timestamps, and more. 100% offline.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Drop Zone ── */}
        {!hasFile && (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 16, padding: '60px 24px',
              border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 16,
              background: isDragging ? 'var(--accent-bg)' : 'var(--surface)',
              cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none',
            }}
          >
            <input
              ref={fileInputRef} type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = '' }}
            />
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 34, transition: 'transform 0.2s',
              transform: isDragging ? 'scale(1.1)' : 'scale(1)',
            }}>🔍</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
                {isDragging ? 'Drop image here' : 'Open an Image'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
                Drag & drop or click · JPEG, PNG, WebP, TIFF & more
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                All processing is done locally — no upload
              </div>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {hasFile && (
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>

            {/* Left: thumbnail + file info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {imgSrc && (
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img
                    src={imgSrc}
                    alt="Preview"
                    onLoad={e => { setImgNaturalW(e.currentTarget.naturalWidth); setImgNaturalH(e.currentTarget.naturalHeight) }}
                    style={{ width: '100%', display: 'block', objectFit: 'cover' }}
                  />
                </div>
              )}
              <div className="panel" style={{ padding: '10px 12px', fontSize: 11, fontFamily: 'var(--font-mono)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ color: 'var(--text-muted)', wordBreak: 'break-all' }}>{fileName}</div>
                <div style={{ color: 'var(--text-dim)' }}>{fmtSize(fileSize)}</div>
                {imgNaturalW > 0 && <div style={{ color: 'var(--text-dim)' }}>{imgNaturalW} × {imgNaturalH}px</div>}
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()} style={{ justifyContent: 'center' }}>
                  Open Another
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleCopyJson} style={{ justifyContent: 'center' }}>
                  {copiedJson ? '✓ Copied' : 'Copy as JSON'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleStripExif} style={{ justifyContent: 'center' }}>
                  Strip EXIF & Download
                </button>
              </div>
              <input
                ref={fileInputRef} type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = '' }}
              />
            </div>

            {/* Right: grouped tags */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Stats Summary banner */}
              <div className="panel" style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent-dim)',
                borderRadius: 10,
                color: 'var(--accent)',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                fontWeight: 500
              }}>
                <span>
                  {removableCount > 0
                    ? `${removableCount} removable metadata tags detected`
                    : 'No removable metadata tags detected (Image is clean)'}
                </span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', opacity: 0.8 }}>
                  {Object.keys(tags).length} total properties
                </span>
              </div>

              {/* GPS Map link */}
              {hasGPS && (
                <a
                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', borderRadius: 10,
                    background: 'var(--accent-bg)', border: '1px solid var(--accent-dim)',
                    textDecoration: 'none', color: 'var(--accent)',
                    fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18 }}>📍</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>View on Google Maps</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', opacity: 0.8, marginTop: 2 }}>
                      {lat.toFixed(5)}, {lng.toFixed(5)}
                    </div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 16 }}>↗</span>
                </a>
              )}

              {/* Grouped metadata tables */}
              {GROUP_INFOS.map(group => {
                const rows = Object.entries(tags).filter(([_, t]) => t.group === group.key)
                if (rows.length === 0) return null
                return (
                  <div key={group.key} className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                      padding: '8px 14px',
                      background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{ fontSize: 15 }}>{group.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
                        {group.label}
                      </span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      <tbody>
                        {rows.map(([key, tag], i) => (
                          <tr key={key} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <td style={{
                              padding: '7px 14px', color: 'var(--text-muted)',
                              width: '38%', whiteSpace: 'nowrap',
                              borderRight: '1px solid var(--border)',
                              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
                            }}>
                              {tag.label}
                              {tag.removable && (
                                <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '1.5px 5px', borderRadius: 4, fontWeight: 600 }}>
                                  removable
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '7px 14px', color: 'var(--text)', wordBreak: 'break-word' }}>
                              {formatValue(key, tag.value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}

              {/* All raw tags (collapsed by default) */}
              <details style={{ marginTop: 8 }}>
                <summary style={{
                  cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: 'var(--text-muted)', fontFamily: 'var(--font-sans)',
                  userSelect: 'none', padding: '4px 0',
                  listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>▶</span> All Raw Properties ({Object.keys(tags).length})
                </summary>
                <pre style={{
                  marginTop: 8, background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: '12px 14px', fontSize: 11,
                  color: 'var(--text-dim)', lineHeight: 1.7,
                  overflowX: 'auto', maxHeight: 300, overflowY: 'auto',
                }}>
                  {JSON.stringify(
                    Object.entries(tags).reduce((acc, [k, v]) => ({ ...acc, [v.label]: v.value }), {}),
                    null,
                    2
                  )}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
