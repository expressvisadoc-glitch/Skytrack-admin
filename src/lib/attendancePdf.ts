import { type FullAttendanceRecord } from './api'

/**
 * Escapes characters for PDF text streams and standardizes encoding
 */
function escapePdfText(str?: string | null): string {
  if (!str) return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\u2013\u2014]/g, '-') // en-dash, em-dash
    .replace(/[\u2022]/g, '*')
    .replace(/[^\x20-\x7E]/g, ' ') // fallback to ASCII for Type 1 Helvetica
}

type RGB = [number, number, number]

interface PageStream {
  stream: string[]
}

// Global cache for letterhead so we don't fetch it repeatedly
let cachedLetterhead: Uint8Array | null = null
let cachedLetterheadWidth = 0
let cachedLetterheadHeight = 0

async function loadLetterhead(): Promise<{ bytes: Uint8Array, width: number, height: number } | null> {
  if (cachedLetterhead) {
    return { bytes: cachedLetterhead, width: cachedLetterheadWidth, height: cachedLetterheadHeight }
  }
  try {
    const res = await fetch('/letterhead.jpg')
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    
    // Get dimensions
    return new Promise((resolve) => {
      const blob = new Blob([bytes], { type: 'image/jpeg' })
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        cachedLetterhead = bytes
        cachedLetterheadWidth = img.width
        cachedLetterheadHeight = img.height
        URL.revokeObjectURL(url)
        resolve({ bytes, width: img.width, height: img.height })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      img.src = url
    })
  } catch (err) {
    console.warn('Could not load letterhead.jpg', err)
    return null
  }
}

export async function generateAttendancePdf(
  record: FullAttendanceRecord,
  formattedToday: string
): Promise<Blob> {
  const pageWidth = 595.28
  const pageHeight = 841.89
  const marginX = 40
  const contentWidth = pageWidth - marginX * 2 // 515.28

  const letterhead = await loadLetterhead()

  // Color Palette
  const cRed: RGB = [0.86, 0.15, 0.15]
  const cDarkSlate: RGB = [0.06, 0.09, 0.16]
  const cSlate700: RGB = [0.20, 0.25, 0.33]
  const cSlate500: RGB = [0.39, 0.45, 0.55]
  const cSlate400: RGB = [0.58, 0.64, 0.72]
  const cBorder: RGB = [0.89, 0.91, 0.94]
  const cWhite: RGB = [1, 1, 1]
  const cTableZebra: RGB = [0.98, 0.99, 1.0]

  const statusColors: Record<string, { fill: RGB; border: RGB; text: RGB }> = {
    Present: { fill: [0.93, 0.99, 0.96], border: [0.65, 0.95, 0.82], text: [0.02, 0.59, 0.41] },
    Late: { fill: [1.0, 0.98, 0.92], border: [0.99, 0.88, 0.65], text: [0.85, 0.47, 0.02] },
    Leave: { fill: [0.96, 0.95, 1.0], border: [0.85, 0.82, 0.98], text: [0.49, 0.23, 0.93] },
    Absent: { fill: [1.0, 0.95, 0.95], border: [0.99, 0.79, 0.82], text: [0.88, 0.11, 0.28] },
    'Half Day': { fill: [0.94, 0.96, 1.0], border: [0.75, 0.83, 0.99], text: [0.15, 0.39, 0.92] },
  }

  const pages: PageStream[] = []

  const addPage = (): PageStream => {
    const page: PageStream = { stream: [] }
    if (letterhead) {
      page.stream.push('q')
      // Draw letterhead to fill the page exactly
      page.stream.push(`${pageWidth.toFixed(2)} 0 0 ${pageHeight.toFixed(2)} 0 0 cm`)
      page.stream.push('/Im1 Do')
      page.stream.push('Q')
    }
    pages.push(page)
    return page
  }

  const drawRect = (p: PageStream, x: number, y: number, w: number, h: number, fill?: RGB | null, stroke?: RGB | null, lineWidth = 1) => {
    p.stream.push('q')
    if (stroke) {
      p.stream.push(`${stroke[0]} ${stroke[1]} ${stroke[2]} RG`)
      p.stream.push(`${lineWidth} w`)
    }
    if (fill) {
      p.stream.push(`${fill[0]} ${fill[1]} ${fill[2]} rg`)
    }
    p.stream.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`)
    if (fill && stroke) p.stream.push('B')
    else if (fill) p.stream.push('f')
    else if (stroke) p.stream.push('s')
    p.stream.push('Q')
  }

  const drawRoundedRect = (p: PageStream, x: number, y: number, w: number, h: number, r: number, fill?: RGB | null, stroke?: RGB | null, lineWidth = 1) => {
    p.stream.push('q')
    if (stroke) {
      p.stream.push(`${stroke[0]} ${stroke[1]} ${stroke[2]} RG`)
      p.stream.push(`${lineWidth} w`)
    }
    if (fill) {
      p.stream.push(`${fill[0]} ${fill[1]} ${fill[2]} rg`)
    }
    const k = 0.5522847498
    const kr = r * k
    const x1 = x, x2 = x + r, x3 = x + w - r, x4 = x + w
    const y1 = y, y2 = y + r, y3 = y + h - r, y4 = y + h

    p.stream.push(`${x2.toFixed(2)} ${y1.toFixed(2)} m`)
    p.stream.push(`${x3.toFixed(2)} ${y1.toFixed(2)} l`)
    p.stream.push(`${(x3 + kr).toFixed(2)} ${y1.toFixed(2)} ${x4.toFixed(2)} ${(y1 + r - kr).toFixed(2)} ${x4.toFixed(2)} ${y2.toFixed(2)} c`)
    p.stream.push(`${x4.toFixed(2)} ${y3.toFixed(2)} l`)
    p.stream.push(`${x4.toFixed(2)} ${(y3 + kr).toFixed(2)} ${(x3 + kr).toFixed(2)} ${y4.toFixed(2)} ${x3.toFixed(2)} ${y4.toFixed(2)} c`)
    p.stream.push(`${x2.toFixed(2)} ${y4.toFixed(2)} l`)
    p.stream.push(`${(x2 - kr).toFixed(2)} ${y4.toFixed(2)} ${x1.toFixed(2)} ${(y3 + kr).toFixed(2)} ${x1.toFixed(2)} ${y3.toFixed(2)} c`)
    p.stream.push(`${x1.toFixed(2)} ${y2.toFixed(2)} l`)
    p.stream.push(`${x1.toFixed(2)} ${(y1 + r - kr).toFixed(2)} ${(x2 - kr).toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${y1.toFixed(2)} c`)

    if (fill && stroke) p.stream.push('B')
    else if (fill) p.stream.push('f')
    else if (stroke) p.stream.push('s')
    p.stream.push('Q')
  }

  const drawLine = (p: PageStream, x1: number, y1: number, x2: number, y2: number, color: RGB, lineWidth = 1) => {
    p.stream.push('q')
    p.stream.push(`${color[0]} ${color[1]} ${color[2]} RG`)
    p.stream.push(`${lineWidth} w`)
    p.stream.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`)
    p.stream.push('Q')
  }

  const drawText = (p: PageStream, x: number, y: number, text: string, size: number, font: 'F1' | 'F2' = 'F1', color: RGB = cDarkSlate) => {
    const escaped = escapePdfText(text)
    p.stream.push('BT')
    p.stream.push(`/${font} ${size} Tf`)
    p.stream.push(`${color[0]} ${color[1]} ${color[2]} rg`)
    p.stream.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`)
    p.stream.push(`(${escaped}) Tj`)
    p.stream.push('ET')
  }

  const history = record.history || []
  let countPresent = 0
  let countLate = 0
  let countLeave = 0
  let countAbsent = 0
  let countHalfDay = 0

  history.forEach((h) => {
    if (h.status === 'Present') countPresent++
    else if (h.status === 'Late') countLate++
    else if (h.status === 'Leave') countLeave++
    else if (h.status === 'Absent') countAbsent++
    else if (h.status === 'Half Day') countHalfDay++
  })

  let currentPage = addPage()
  
  // If letterhead is used, we shift content down so it doesn't overlap the header
  let curY = letterhead ? pageHeight - 160 : pageHeight - 45

  if (!letterhead) {
    drawRoundedRect(currentPage, marginX, curY - 36, 36, 36, 8, cRed, null)
    drawText(currentPage, marginX + 11.5, curY - 24, 'S', 20, 'F2', cWhite)
    drawText(currentPage, marginX + 46, curY - 14, 'SkyTrack Enterprise', 16, 'F2', cDarkSlate)
    drawText(currentPage, marginX + 46, curY - 28, 'SKYPASS VISA SERVICES • ATTENDANCE LOG', 7.5, 'F2', cRed)
  }

  const docId = `DOC-${record.employeeId}-${record.date.replace(/[^0-9]/g, '') || 'REPORT'}`
  drawText(currentPage, pageWidth - marginX - 165, curY - 12, 'OFFICIAL ATTENDANCE SHEET', 10.5, 'F2', cDarkSlate)
  drawText(currentPage, pageWidth - marginX - 165, curY - 25, `Generated: ${formattedToday}`, 8, 'F1', cSlate500)
  drawText(currentPage, pageWidth - marginX - 165, curY - 36, `Document ID: ${docId}`, 7.5, 'F1', cSlate400)

  curY -= 48
  drawLine(currentPage, marginX, curY, pageWidth - marginX, curY, cBorder, 1)
  curY -= 15

  const cardHeight = 72
  const cardBg = letterhead ? null : cWhite
  drawRoundedRect(currentPage, marginX, curY - cardHeight, contentWidth, cardHeight, 10, cardBg, cBorder, 1)

  drawText(currentPage, marginX + 16, curY - 20, record.employeeName, 13, 'F2', cDarkSlate)
  drawText(currentPage, marginX + 16, curY - 35, `Designation: ${record.role || 'Employee'}`, 8.5, 'F1', cSlate700)
  drawText(currentPage, marginX + 16, curY - 48, `Department: ${record.department || 'Not Set'}`, 8.5, 'F1', cSlate500)

  const midX = marginX + 210
  drawText(currentPage, midX, curY - 20, `Employee ID: ${record.employeeId}`, 10, 'F2', cDarkSlate)
  drawText(currentPage, midX, curY - 35, `Shift: ${record.shiftStart || '09:00 AM'} - ${record.shiftEnd || '06:00 PM'}`, 8.5, 'F1', cSlate700)
  drawText(currentPage, midX, curY - 48, `Active Time: ${record.activeHours || 'Standard Hours'}`, 8.5, 'F1', cSlate500)

  const statusCfg = statusColors[record.status] || statusColors.Present
  const badgeWidth = 90
  const badgeHeight = 22
  const badgeX = pageWidth - marginX - badgeWidth - 16
  const badgeY = curY - 38

  drawRoundedRect(currentPage, badgeX, badgeY, badgeWidth, badgeHeight, 6, statusCfg.fill, statusCfg.border, 1)
  drawText(currentPage, badgeX + 18, badgeY + 6.5, record.status.toUpperCase(), 8.5, 'F2', statusCfg.text)
  drawText(currentPage, badgeX + 10, badgeY - 14, `Date: ${record.date}`, 8, 'F1', cSlate500)

  curY -= (cardHeight + 16)

  const metricCardWidth = (contentWidth - 3 * 10) / 4
  const metricCardHeight = 44
  const metrics = [
    { label: 'RECORDED DAYS', value: `${history.length} Days`, color: cDarkSlate, accent: cSlate500 },
    { label: 'PRESENT DAYS', value: `${countPresent} Days`, color: [0.02, 0.59, 0.41] as RGB, accent: [0.65, 0.95, 0.82] as RGB },
    { label: 'LATE ARRIVALS', value: `${countLate} Days`, color: [0.85, 0.47, 0.02] as RGB, accent: [0.99, 0.88, 0.65] as RGB },
    { label: 'LEAVES & ABSENT', value: `${countLeave + countAbsent + countHalfDay} Days`, color: [0.88, 0.11, 0.28] as RGB, accent: [0.99, 0.79, 0.82] as RGB },
  ]

  metrics.forEach((m, idx) => {
    const mx = marginX + idx * (metricCardWidth + 10)
    const metricBg = letterhead ? null : cWhite
    drawRoundedRect(currentPage, mx, curY - metricCardHeight, metricCardWidth, metricCardHeight, 8, metricBg, cBorder, 1)
    drawText(currentPage, mx + 10, curY - 16, m.label, 6.5, 'F2', cSlate400)
    drawText(currentPage, mx + 10, curY - 33, m.value, 11, 'F2', m.color)
  })

  curY -= (metricCardHeight + 20)

  drawText(currentPage, marginX, curY - 4, 'ATTENDANCE HISTORY RECORD', 10, 'F2', cDarkSlate)
  curY -= 14

  const colW = { index: 35, date: 110, time: 230, status: 140.28 }
  const rowHeight = 24

  const drawTableHeader = (p: PageStream, y: number) => {
    drawRoundedRect(p, marginX, y - rowHeight, contentWidth, rowHeight, 4, [0.09, 0.13, 0.20], null)
    let tx = marginX + 10
    drawText(p, tx, y - 15, '#', 7.5, 'F2', cWhite)
    tx += colW.index
    drawText(p, tx, y - 15, 'DATE', 7.5, 'F2', cWhite)
    tx += colW.date
    drawText(p, tx, y - 15, 'CHECK-IN / WORKING HOURS', 7.5, 'F2', cWhite)
    tx += colW.time
    drawText(p, tx, y - 15, 'STATUS', 7.5, 'F2', cWhite)
  }

  drawTableHeader(currentPage, curY)
  curY -= rowHeight

  // Footer threshold depends on letterhead
  const footerThreshold = letterhead ? 80 : 70

  history.forEach((histItem, idx) => {
    if (curY - rowHeight < footerThreshold) {
      currentPage = addPage()
      curY = letterhead ? pageHeight - 160 : pageHeight - 50
      drawText(currentPage, marginX, curY - 4, `Attendance Record (Continued) • ${record.employeeName} (${record.employeeId})`, 9, 'F2', cDarkSlate)
      curY -= 16
      drawTableHeader(currentPage, curY)
      curY -= rowHeight
    }

    if (!letterhead) {
      const isEven = idx % 2 === 0
      const rowBg = isEven ? cWhite : cTableZebra
      drawRect(currentPage, marginX, curY - rowHeight, contentWidth, rowHeight, rowBg, null)
    }
    drawLine(currentPage, marginX, curY - rowHeight, marginX + contentWidth, curY - rowHeight, cBorder, 0.5)

    let tx = marginX + 10
    drawText(currentPage, tx, curY - 15.5, String(idx + 1).padStart(2, '0'), 8, 'F1', cSlate400)
    tx += colW.index
    drawText(currentPage, tx, curY - 15.5, histItem.date, 8.5, 'F2', cDarkSlate)
    tx += colW.date
    drawText(currentPage, tx, curY - 15.5, histItem.time || '—', 8, 'F1', cSlate700)
    tx += colW.time

    const stCol = statusColors[histItem.status] || statusColors.Present
    drawRoundedRect(currentPage, tx, curY - 19, 68, 16, 4, stCol.fill, stCol.border, 0.8)
    drawText(currentPage, tx + 9, curY - 14, histItem.status, 7.5, 'F2', stCol.text)

    curY -= rowHeight
  })

  const totalPages = pages.length
  pages.forEach((p, pIdx) => {
    const footY = letterhead ? 45 : 32
    drawLine(p, marginX, footY + 12, pageWidth - marginX, footY + 12, cBorder, 1)
    drawText(p, marginX, footY, 'SkyTrack v2.4 • Confidential Attendance Sheet • Generated by Skypass Visa Services', 7, 'F1', cSlate400)
    drawText(p, pageWidth - marginX - 50, footY, `Page ${pIdx + 1} of ${totalPages}`, 7, 'F2', cSlate500)
  })

  // Compile PDF Object Tree
  const objects: Uint8Array[] = []
  const encoder = new TextEncoder()
  const addObject = (bytes: Uint8Array) => {
    objects.push(bytes)
    return objects.length
  }

  const catalogIdx = 1
  const pagesIdx = 2
  objects.push(new Uint8Array())
  objects.push(new Uint8Array())

  const fontRegularIdx = addObject(encoder.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'))
  const fontBoldIdx = addObject(encoder.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'))

  let imageXObjectIdx = 0
  if (letterhead) {
    const dictStr = `<< /Type /XObject /Subtype /Image /Width ${letterhead.width} /Height ${letterhead.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${letterhead.bytes.length} >>\nstream\n`
    const endStr = '\nendstream'
    
    // Concat dictionary, binary bytes, and endstream
    const imgObjBytes = new Uint8Array(encoder.encode(dictStr).length + letterhead.bytes.length + encoder.encode(endStr).length)
    let offset = 0
    imgObjBytes.set(encoder.encode(dictStr), offset)
    offset += encoder.encode(dictStr).length
    imgObjBytes.set(letterhead.bytes, offset)
    offset += letterhead.bytes.length
    imgObjBytes.set(encoder.encode(endStr), offset)

    imageXObjectIdx = addObject(imgObjBytes)
  }

  const pageObjIndices: number[] = []

  for (const page of pages) {
    const streamContent = page.stream.join('\n')
    const streamBytes = encoder.encode(streamContent)
    const contentStreamIdx = addObject(encoder.encode(`<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream`))

    const resourcesDict = letterhead 
      ? `<< /Font << /F1 ${fontRegularIdx} 0 R /F2 ${fontBoldIdx} 0 R >> /XObject << /Im1 ${imageXObjectIdx} 0 R >> >>`
      : `<< /Font << /F1 ${fontRegularIdx} 0 R /F2 ${fontBoldIdx} 0 R >> >>`

    const pageObjIdx = addObject(encoder.encode(`<<
  /Type /Page
  /Parent ${pagesIdx} 0 R
  /MediaBox [0 0 ${pageWidth} ${pageHeight}]
  /Contents ${contentStreamIdx} 0 R
  /Resources ${resourcesDict}
>>`))
    pageObjIndices.push(pageObjIdx)
  }

  objects[catalogIdx - 1] = encoder.encode(`<< /Type /Catalog /Pages ${pagesIdx} 0 R >>`)
  objects[pagesIdx - 1] = encoder.encode(`<< /Type /Pages /Kids [${pageObjIndices.map((i) => `${i} 0 R`).join(' ')}] /Count ${pageObjIndices.length} >>`)

  const parts: Uint8Array[] = [encoder.encode('%PDF-1.4\n')]
  let totalOffset = parts[0].length
  const xrefOffsets: number[] = [0]

  for (let i = 0; i < objects.length; i++) {
    const objNum = i + 1
    xrefOffsets[objNum] = totalOffset
    const headerBytes = encoder.encode(`${objNum} 0 obj\n`)
    const footerBytes = encoder.encode(`\nendobj\n`)
    
    parts.push(headerBytes)
    parts.push(objects[i])
    parts.push(footerBytes)
    
    totalOffset += headerBytes.length + objects[i].length + footerBytes.length
  }

  const startXref = totalOffset
  let xrefStr = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= objects.length; i++) {
    const off = String(xrefOffsets[i]).padStart(10, '0')
    xrefStr += `${off} 00000 n \n`
  }
  parts.push(encoder.encode(xrefStr))
  parts.push(encoder.encode(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogIdx} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`))

  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}
