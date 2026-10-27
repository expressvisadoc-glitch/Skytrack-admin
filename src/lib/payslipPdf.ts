import type { Payslip } from './api'

/**
 * Payslip PDF on the company letterhead (public/letterhead.jpg drawn as the page background, like the
 * attendance sheet in attendancePdf.ts). Built from the frozen payslip returned by the backend.
 * Standard PDF fonts have no ₹ glyph, so amounts are written as "Rs.".
 */

type RGB = [number, number, number]

function escapePdfText(str?: string | null): string {
  if (!str) return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[–—−]/g, '-')
    .replace(/[^\x20-\x7E]/g, ' ')
}

// Standard Helvetica / Helvetica-Bold advance widths (1/1000 em) for ASCII 32–126, used for right alignment
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]
const HELVETICA_BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611,
  611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
]

function textWidth(text: string, size: number, bold: boolean): number {
  const widths = bold ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS
  let total = 0
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    total += code >= 32 && code <= 126 ? widths[code - 32] : 556
  }
  return (total * size) / 1000
}

let letterheadCache: { bytes: Uint8Array; width: number; height: number } | null = null

async function loadLetterhead(): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  if (letterheadCache) return letterheadCache
  try {
    const res = await fetch('/letterhead.jpg')
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    const size = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }))
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.width, height: img.height })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      img.src = url
    })
    if (!size) return null
    letterheadCache = { bytes, ...size }
    return letterheadCache
  } catch {
    return null
  }
}

export function formatPdfAmount(amount?: number | null): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '-'
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDays(days?: number | null): string {
  const d = days ?? 0
  return Number.isInteger(d) ? String(d) : String(+d.toFixed(2))
}

export function payslipFileName(p: Payslip): string {
  return `Payslip-${p.employee.employeeId ?? 'employee'}-${p.month}-v${p.version}.pdf`.replace(/[^A-Za-z0-9._-]/g, '_')
}

export async function generatePayslipPdf(p: Payslip): Promise<Blob> {
  const pageWidth = 595.28
  const pageHeight = 841.89
  const marginX = 48
  const right = pageWidth - marginX
  const letterhead = await loadLetterhead()

  const cDark: RGB = [0.06, 0.09, 0.16]
  const cMuted: RGB = [0.39, 0.45, 0.55]
  const cBorder: RGB = [0.85, 0.87, 0.9]
  const cRed: RGB = [0.78, 0.16, 0.16]
  const cGreen: RGB = [0.02, 0.47, 0.34]
  const cShade: RGB = [0.96, 0.97, 0.98]

  const ops: string[] = []
  if (letterhead) {
    ops.push('q', `${pageWidth.toFixed(2)} 0 0 ${pageHeight.toFixed(2)} 0 0 cm`, '/Im1 Do', 'Q')
  }
  const text = (x: number, y: number, s: string, size: number, bold = false, color: RGB = cDark) => {
    ops.push('BT', `/${bold ? 'F2' : 'F1'} ${size} Tf`, `${color.join(' ')} rg`, `${x.toFixed(2)} ${y.toFixed(2)} Td`, `(${escapePdfText(s)}) Tj`, 'ET')
  }
  const textRight = (xRight: number, y: number, s: string, size: number, bold = false, color: RGB = cDark) => {
    // Measure the text as it will be drawn (escapes do not add width)
    const drawn = s.replace(/[\u2013\u2014\u2212]/g, '-').replace(/[^\x20-\x7E]/g, ' ')
    text(xRight - textWidth(drawn, size, bold), y, s, size, bold, color)
  }
  const line = (x1: number, y1: number, x2: number, y2: number, color: RGB = cBorder, w = 0.8) => {
    ops.push('q', `${color.join(' ')} RG`, `${w} w`, `${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`, 'Q')
  }
  const rect = (x: number, y: number, w: number, h: number, fill: RGB) => {
    ops.push('q', `${fill.join(' ')} rg`, `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`, 'Q')
  }

  const s = p.salary
  const monthLabel = new Date(`${p.month}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const paidDays = Math.max(0, (s.paidWorkingDays ?? 0) - (s.totalLopDays ?? 0))
  const generated = new Date(p.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  // Clear the letterhead's header band
  let y = letterhead ? pageHeight - 188 : pageHeight - 60

  // Title block
  text(marginX, y, p.companyName || 'Skypass Visa Services', 13, true)
  textRight(right, y, 'PAYSLIP', 16, true, cRed)
  y -= 18
  text(marginX, y, `Pay period: ${monthLabel}`, 10, false, cMuted)
  textRight(right, y, `No. ${p.payslipNumber}`, 9, false, cMuted)
  y -= 13
  textRight(right, y, `Issued ${generated}${p.version > 1 ? ` (revision ${p.version})` : ''}`, 9, false, cMuted)
  y -= 16
  line(marginX, y, right, y, cDark, 1)

  // Employee details
  y -= 24
  const col2 = marginX + (right - marginX) / 2
  const detail = (x: number, yy: number, label: string, value: string) => {
    text(x, yy, label.toUpperCase(), 7.5, true, cMuted)
    text(x, yy - 13, value || '-', 10.5, false, cDark)
  }
  detail(marginX, y, 'Employee name', p.employee.name ?? '-')
  detail(col2, y, 'Employee ID', p.employee.employeeId ?? '-')
  y -= 34
  detail(marginX, y, 'Designation', p.employee.designation ?? '-')
  detail(col2, y, 'Department', p.employee.department ?? '-')
  y -= 34
  detail(marginX, y, 'Working days in month', formatDays(s.workingDaysInMonth))
  detail(col2, y, 'Paid days', formatDays(paidDays))

  // Earnings and deductions table
  y -= 36
  const colDays = right - 150
  rect(marginX, y - 6, right - marginX, 20, cShade)
  text(marginX + 8, y, 'DESCRIPTION', 8, true, cMuted)
  textRight(colDays, y, 'DAYS', 8, true, cMuted)
  textRight(right - 8, y, 'AMOUNT', 8, true, cMuted)
  y -= 24

  const row = (label: string, days: string, amount: string, color: RGB = cDark, bold = false) => {
    text(marginX + 8, y, label, 10, bold, color)
    if (days) textRight(colDays, y, days, 10, bold, color)
    textRight(right - 8, y, amount, 10, bold, color)
    y -= 10
    line(marginX, y, right, y)
    y -= 14
  }

  row('Monthly gross salary', '', formatPdfAmount(s.monthlyGross))
  if (s.earnedGross !== null && s.monthlyGross !== null && s.earnedGross !== s.monthlyGross) {
    row('Payable for days employed', formatDays(s.paidWorkingDays), formatPdfAmount(s.earnedGross))
  }
  row('Less: Absences', formatDays(s.absenceDays), `- ${formatPdfAmount(s.absenceAmount)}`, cRed)
  row('Less: Loss of pay (LOP) leave', formatDays(s.lopLeaveDays), `- ${formatPdfAmount(s.lopLeaveAmount)}`, cRed)
  row(
    `Less: Late marks (${s.lateMarks ?? 0} marks, ${s.lateMarksPerUnit ?? '-'} = ${formatDays(s.lateLopDaysPerUnit)} day)`,
    formatDays(s.lateLopDays),
    `- ${formatPdfAmount(s.lateAmount)}`,
    cRed
  )
  row('Total deductions', formatDays(s.totalLopDays), `- ${formatPdfAmount(s.totalDeductions)}`, cRed, true)

  y -= 6
  rect(marginX, y - 10, right - marginX, 30, [0.93, 0.98, 0.95])
  text(marginX + 8, y, 'NET PAY', 12, true, cGreen)
  textRight(right - 8, y, formatPdfAmount(s.netPay), 13, true, cGreen)

  y -= 44
  text(marginX, y, `Per-day rate: ${formatPdfAmount(s.perDayRate)} (monthly gross / ${formatDays(s.workingDaysInMonth)} working days).`, 8.5, false, cMuted)
  y -= 12
  text(marginX, y, 'This is a system-generated payslip and does not require a signature.', 8.5, false, cMuted)

  // Assemble the PDF (single page)
  const encoder = new TextEncoder()
  const objects: Uint8Array[] = []
  const add = (bytes: Uint8Array) => {
    objects.push(bytes)
    return objects.length
  }
  add(new Uint8Array()) // 1: catalog (filled below)
  add(new Uint8Array()) // 2: pages
  const fontRegular = add(encoder.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'))
  const fontBold = add(encoder.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'))
  let image = 0
  if (letterhead) {
    const head = encoder.encode(
      `<< /Type /XObject /Subtype /Image /Width ${letterhead.width} /Height ${letterhead.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${letterhead.bytes.length} >>\nstream\n`
    )
    const tail = encoder.encode('\nendstream')
    const bytes = new Uint8Array(head.length + letterhead.bytes.length + tail.length)
    bytes.set(head, 0)
    bytes.set(letterhead.bytes, head.length)
    bytes.set(tail, head.length + letterhead.bytes.length)
    image = add(bytes)
  }
  const content = ops.join('\n')
  const contentObj = add(encoder.encode(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`))
  const resources = `<< /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >>${image ? ` /XObject << /Im1 ${image} 0 R >>` : ''} >>`
  const page = add(encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObj} 0 R /Resources ${resources} >>`))
  objects[0] = encoder.encode('<< /Type /Catalog /Pages 2 0 R >>')
  objects[1] = encoder.encode(`<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`)
  const title = escapePdfText(`Payslip ${p.payslipNumber}`)
  const info = add(encoder.encode(`<< /Title (${title}) /Producer (SkyTrack) >>`))

  const parts: Uint8Array[] = [encoder.encode('%PDF-1.4\n')]
  let offset = parts[0].length
  const offsets: number[] = []
  objects.forEach((obj, i) => {
    offsets.push(offset)
    const headBytes = encoder.encode(`${i + 1} 0 obj\n`)
    const tailBytes = encoder.encode('\nendobj\n')
    parts.push(headBytes, obj, tailBytes)
    offset += headBytes.length + obj.length + tailBytes.length
  })
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const o of offsets) xref += `${String(o).padStart(10, '0')} 00000 n \n`
  parts.push(encoder.encode(xref))
  parts.push(encoder.encode(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${offset}\n%%EOF\n`))
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}

export async function downloadPayslipPdf(p: Payslip): Promise<void> {
  const blob = await generatePayslipPdf(p)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = payslipFileName(p)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
