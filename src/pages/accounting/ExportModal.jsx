import { useState } from 'react'

// ─── Column definitions ───────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: 'tripDate',     label: 'วันที่',               default: true },
  { key: 'truck',        label: 'ทะเบียนรถ',             default: true },
  { key: 'company',      label: 'บริษัท',                default: true },
  { key: 'route',        label: 'เส้นทาง',               default: true },
  { key: 'income',       label: 'รายรับรวม (บาท)',       default: true },
  { key: 'expense',      label: 'รายจ่ายรวม (บาท)',      default: true },
  { key: 'profit',       label: 'กำไร (บาท)',            default: true },
  { key: 'paymentMode',  label: 'ประเภทชำระ',           default: true },
  { key: 'status',       label: 'สถานะ',                 default: false },
  { key: 'note',         label: 'หมายเหตุ',              default: false },
]

const RANGE_OPTIONS = [
  { key: 'month',   label: 'เดือนนี้' },
  { key: 'last3',   label: '3 เดือนล่าสุด' },
  { key: 'year',    label: 'ปีนี้' },
  { key: 'custom',  label: 'กำหนดเอง' },
]

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const MONTHS_FULL_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

// ─── Helpers ──────────────────────────────────────────────────────────────────
const totalExp = (exp = {}) =>
  ['fuel','driver','toll','bridge','oilChange','tire','other']
    .reduce((s, k) => s + (Number(exp[k]) || 0), 0)

const totalIncome = (t) =>
  (Number(t.agreedIncome) || 0) +
  (Number(t.otherIncome) || 0) +
  (t.hasReturn ? (Number(t.returnAgreedIncome) || 0) + (Number(t.returnOtherIncome) || 0) : 0)

function getRangeFilter(range, customFrom, customTo) {
  const now = new Date()
  if (range === 'month') {
    return t => {
      if (!t.tripDate) return false
      const d = new Date(t.tripDate)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }
  }
  if (range === 'last3') {
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return t => t.tripDate && new Date(t.tripDate) >= from
  }
  if (range === 'year') {
    return t => t.tripDate && new Date(t.tripDate).getFullYear() === now.getFullYear()
  }
  if (range === 'custom' && customFrom && customTo) {
    const f = new Date(customFrom), to = new Date(customTo)
    to.setHours(23, 59, 59)
    return t => t.tripDate && new Date(t.tripDate) >= f && new Date(t.tripDate) <= to
  }
  return () => true
}

function getRangeLabel(range, customFrom, customTo) {
  const now = new Date()
  if (range === 'month') return `${MONTHS_TH[now.getMonth()]} ${now.getFullYear() + 543}`
  if (range === 'last3') return '3 เดือนล่าสุด'
  if (range === 'year') return `ปี ${now.getFullYear() + 543}`
  if (range === 'custom' && customFrom && customTo) return `${customFrom} ถึง ${customTo}`
  return ''
}

// ดึงเดือน+ปีจากช่วงเวลาสำหรับหัวข้อวางบิล
function getBillingHeading(range, customFrom, customTo) {
  const now = new Date()
  if (range === 'month') {
    return { month: MONTHS_FULL_TH[now.getMonth()], year: now.getFullYear() + 543 }
  }
  if (range === 'year') {
    return { month: null, year: now.getFullYear() + 543 }
  }
  if (range === 'custom' && customFrom) {
    const d = new Date(customFrom)
    return { month: MONTHS_FULL_TH[d.getMonth()], year: d.getFullYear() + 543 }
  }
  return { month: null, year: now.getFullYear() + 543 }
}

function formatTimestamp(d = new Date()) {
  return d.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDateTH(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function buildRows(trips, trucks, companies, selectedCols) {
  return trips.map(t => {
    const truck = trucks.find(tk => tk.id === t.truckId)
    const company = companies.find(c => c.id === t.companyId)
    const income = totalIncome(t)
    const expense = totalExp(t.expenses)
    const route = t.hasReturn
      ? `${t.origin}→${t.destination} / ${t.returnOrigin||t.destination}→${t.returnDestination||t.origin}`
      : `${t.origin}→${t.destination}`
    const paymentLabel = t.paymentMode === 'cash' ? 'เงินสด' : 'เครดิต'
    const statusLabel  = t.paymentMode === 'cash' ? 'เงินสด'
      : t.status === 'received' ? 'รับแล้ว' : 'รอรับ'
    const map = {
      tripDate:    t.tripDate || '',
      truck:       truck?.plate || '',
      company:     company?.name || '',
      route,
      income,
      expense,
      profit:      income - expense,
      paymentMode: paymentLabel,
      status:      statusLabel,
      note:        t.note || '',
    }
    return selectedCols.reduce((acc, k) => { acc[k] = map[k]; return acc }, {})
  })
}

// ─── Excel Export ─────────────────────────────────────────────────────────────
async function exportExcel(rows, selectedCols, rangeLabel, exportedAt) {
  if (!window.XLSX) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
      s.onload = resolve; s.onerror = reject
      document.head.appendChild(s)
    })
  }
  const XLSX = window.XLSX
  const colDef = ALL_COLUMNS.filter(c => selectedCols.includes(c.key))
  const headers = colDef.map(c => c.label)
  const dataRows = rows.map(r => colDef.map(c => r[c.key]))
  const ws_data = [
    [`รายงานบัญชีรายรับ-รายจ่าย — ${rangeLabel}`],
    [`Export ณ ${exportedAt}`],
    [],
    headers,
    ...dataRows,
    [],
    [`รวม ${rows.length} เที่ยว`],
  ]
  const ws = XLSX.utils.aoa_to_sheet(ws_data)
  ws['!cols'] = colDef.map(c =>
    ['income','expense','profit'].includes(c.key) ? { wch: 16 }
    : c.key === 'route' ? { wch: 36 } : { wch: 18 }
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'รายงาน')
  const dateSlug = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `บัญชี_${rangeLabel}_${dateSlug}.xlsx`)
}

// ─── PDF Export (HTML Print) ──────────────────────────────────────────────────
async function exportPDF(rows, selectedCols, rangeLabel, exportedAt, summary) {
  const colDef = ALL_COLUMNS.filter(c => selectedCols.includes(c.key))

  const summaryRows = [
    summary.cashIncome  > 0 ? ['รายรับเงินสด',  `${summary.cashIncome.toLocaleString()} บาท`]  : null,
    summary.creditPending > 0 ? ['เครดิตรอรับ', `${summary.creditPending.toLocaleString()} บาท`] : null,
    summary.totalExpense > 0 ? ['รายจ่ายรวม',  `${summary.totalExpense.toLocaleString()} บาท`]  : null,
    summary.totalProfit  !== 0 ? ['กำไรสุทธิ',  `${summary.totalProfit.toLocaleString()} บาท`]  : null,
  ].filter(Boolean)

  const detailRows = rows.map(r =>
    colDef.map(c => {
      const v = r[c.key]
      if (c.key === 'tripDate') return formatDateTH(v)
      return ['income','expense','profit'].includes(c.key)
        ? Number(v).toLocaleString() : String(v ?? '')
    })
  )

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Sarabun', sans-serif; font-size: 11pt; color: #1a1a1a; padding: 20px; }
    h1 { font-size: 16pt; font-weight: 700; margin-bottom: 4px; }
    .meta { font-size: 9pt; color: #666; margin-bottom: 16px; }
    .summary { border-collapse: collapse; margin-bottom: 20px; }
    .summary td { padding: 4px 12px 4px 0; font-size: 10pt; }
    .summary td:first-child { color: #555; width: 160px; }
    .summary td:last-child { font-weight: 600; }
    table.detail { width: 100%; border-collapse: collapse; font-size: 9pt; }
    table.detail th { background: #1e64b4; color: #fff; font-weight: 600; padding: 6px 8px; text-align: left; border: 1px solid #1557a0; }
    table.detail td { padding: 5px 8px; border: 1px solid #e0e0e0; }
    table.detail tr:nth-child(even) td { background: #f5f8ff; }
    .footer { margin-top: 16px; font-size: 8pt; color: #999; text-align: right; }
    @media print {
      body { padding: 10px; }
      @page { size: A4 landscape; margin: 12mm; }
    }
  </style>
</head>
<body>
  <h1>รายงานบัญชีรายรับ-รายจ่าย</h1>
  <div class="meta">ช่วงเวลา: ${rangeLabel} &nbsp;|&nbsp; Export ณ ${exportedAt}</div>
  ${summaryRows.length > 0 ? `
  <table class="summary">
    ${summaryRows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
  </table>` : ''}
  <table class="detail">
    <thead>
      <tr>${colDef.map(c => `<th>${c.label}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${detailRows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">รายงานบัญชีรายรับ-รายจ่าย | ${exportedAt}</div>
  <script>
    window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 800) }
  </script>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}

// ─── Billing PDF Export (แยกรายคัน) ──────────────────────────────────────────
async function exportBillingPDF(trips, trucks, companies, range, customFrom, customTo) {
  const filterFn = getRangeFilter(range, customFrom, customTo)
  const filtered = trips.filter(filterFn)
  const { month, year } = getBillingHeading(range, customFrom, customTo)
  const exportedAt = formatTimestamp()

  // จัดกลุ่มตามรถ
  const truckGroups = {}
  filtered.forEach(t => {
    const key = t.truckId || '__unknown__'
    if (!truckGroups[key]) truckGroups[key] = []
    truckGroups[key].push(t)
  })

  // สร้าง HTML แยกแต่ละคัน แบ่งหน้า
  const truckSections = Object.entries(truckGroups).map(([truckId, truckTrips], groupIdx) => {
    const truck = trucks.find(tk => tk.id === truckId)
    const plate = truck?.plate || 'ไม่ระบุทะเบียน'

    const totalTripIncome  = truckTrips.reduce((s, t) => s + totalIncome(t), 0)
    const totalTripExpense = truckTrips.reduce((s, t) => s + totalExp(t.expenses), 0)
    const totalTripProfit  = totalTripIncome - totalTripExpense

    const rows = truckTrips
      .slice()
      .sort((a, b) => (a.tripDate || '').localeCompare(b.tripDate || ''))
      .map((t, i) => {
        const company = companies.find(c => c.id === t.companyId)
        const income  = totalIncome(t)
        const expense = totalExp(t.expenses)
        const profit  = income - expense
        const route   = t.hasReturn
          ? `${t.origin}→${t.destination} / ${t.returnOrigin||t.destination}→${t.returnDestination||t.origin}`
          : `${t.origin}→${t.destination}`
        const payLabel = t.paymentMode === 'cash' ? 'เงินสด'
          : t.status === 'received' ? 'รับแล้ว' : 'รอรับ'
        const rowBg = i % 2 === 1 ? 'background:#f0f5ff' : ''
        return `
          <tr style="${rowBg}">
            <td style="text-align:center">${i + 1}</td>
            <td>${formatDateTH(t.tripDate)}</td>
            <td>${route}</td>
            <td style="text-align:right">${income.toLocaleString()}</td>
          </tr>`
      }).join('')

    const headingTitle = month
      ? `เที่ยววิ่งประจำเดือน${month} ปี ${year}`
      : `เที่ยววิ่งประจำปี ${year}`

    return `
      <div class="truck-section" style="${groupIdx > 0 ? 'page-break-before:always;' : ''}">
        <!-- Header bar -->
        <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:18px;padding-bottom:10px;border-bottom:2.5px solid #1e64b4">
          <div>
            <div style="font-size:13pt;color:#999;font-weight:600;letter-spacing:.5px;margin-bottom:3px">${headingTitle}</div>
            <div style="font-size:20pt;font-weight:700;color:#1a202c">ทะเบียนรถ ${plate}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:9pt;color:#888">จำนวน <strong style="color:#1e64b4">${truckTrips.length}</strong> เที่ยว</div>
          </div>
        </div>

        <!-- Table -->
        <table style="width:100%;border-collapse:collapse;font-size:9.5pt">
          <thead>
            <tr>
              <th style="width:34px">#</th>
              <th>วันที่</th>
              <th>เส้นทาง</th>
              <th style="text-align:right">รายรับ (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;padding:8px;font-weight:700;border-top:2px solid #1e64b4;background:#f8faff">รวมทั้งสิ้น</td>
              <td style="text-align:right;font-weight:700;border-top:2px solid #1e64b4;background:#f0f5ff;color:#16a34a">${totalTripIncome.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Sarabun', sans-serif; font-size: 11pt; color: #1a1a1a; background: #fff; }

    .truck-section { padding: 24px 28px; min-height: 100vh; position: relative; padding-bottom: 60px; }

    table { width: 100%; border-collapse: collapse; }
    thead th {
      background: #1e64b4; color: #fff; font-weight: 600;
      padding: 7px 10px; border: 1px solid #1557a0; font-size: 9pt;
    }
    tbody td { padding: 6px 10px; border: 1px solid #dde3f0; font-size: 9pt; }
    tfoot td { padding: 7px 10px; border: 1px solid #b8c9ea; font-size: 9.5pt; }

    .page-footer {
      position: fixed;
      bottom: 16px;
      right: 28px;
      font-size: 8pt;
      color: #aaa;
      text-align: right;
    }

    @media print {
      body { background: white; }
      .truck-section { padding: 16px 18px; }
      @page {
        size: A4 landscape;
        margin: 14mm 16mm 20mm 16mm;
      }
      .page-footer { display: none; }
    }
  </style>
</head>
<body>

${truckSections}

<div class="page-footer">
  Export ณ ${exportedAt} &nbsp;|&nbsp; หน้า <span id="pg"></span>
</div>

<script>
  // Page numbering for screen view
  document.getElementById('pg').textContent = '1';
  const style = document.createElement('style');
  style.textContent = \`
    @media print {
      @page { @bottom-right { content: "Export ณ ${exportedAt}   หน้า " counter(page) " / " counter(pages); font-size: 8pt; color: #999; font-family: Sarabun, sans-serif; } }
    }
  \`;
  document.head.appendChild(style);

  // รอให้ฟอนต์โหลดเสร็จก่อน print เพื่อป้องกันตัวอักษรภาษาไทยแตก
  window.onload = () => {
    document.fonts.ready.then(() => {
      setTimeout(() => { window.print(); window.close(); }, 200);
    });
  };
</script>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ExportModal({ trips, trucks, companies, onClose }) {
  const [range, setRange]           = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [selected, setSelected]     = useState(new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.key)))
  const [loading, setLoading]       = useState(null)  // 'excel' | 'pdf' | 'billing' | null

  const toggleCol = (key) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(prev =>
      prev.size === ALL_COLUMNS.length
        ? new Set()
        : new Set(ALL_COLUMNS.map(c => c.key))
    )
  }

  const prepareData = () => {
    const filterFn   = getRangeFilter(range, customFrom, customTo)
    const filtered   = trips.filter(filterFn)
    const rangeLabel = getRangeLabel(range, customFrom, customTo)
    const exportedAt = formatTimestamp()
    const selectedCols = ALL_COLUMNS.filter(c => selected.has(c.key)).map(c => c.key)
    const rows = buildRows(filtered, trucks, companies, selectedCols)

    const cashIncome     = filtered.filter(t => t.paymentMode === 'cash').reduce((s, t) => s + totalIncome(t), 0)
    const creditPending  = filtered.filter(t => t.paymentMode === 'credit' && t.status === 'pending').reduce((s, t) => s + totalIncome(t), 0)
    const creditReceived = filtered.filter(t => t.paymentMode === 'credit' && t.status === 'received').reduce((s, t) => s + totalIncome(t), 0)
    const totalExpense   = filtered.reduce((s, t) => s + totalExp(t.expenses), 0)
    const totalProfit    = cashIncome + creditPending + creditReceived - totalExpense

    return { rows, rangeLabel, exportedAt, selectedCols, summary: { cashIncome, creditPending, creditReceived, totalExpense, totalProfit }, count: filtered.length }
  }

  const handleExcel = async () => {
    if (!selected.size) return alert('เลือกอย่างน้อย 1 คอลัมน์')
    setLoading('excel')
    try {
      const { rows, rangeLabel, exportedAt, selectedCols } = prepareData()
      await exportExcel(rows, selectedCols, rangeLabel, exportedAt)
    } catch (e) { console.error(e); alert('Export ไม่สำเร็จ: ' + e.message) }
    setLoading(null)
  }

  const handlePDF = async () => {
    if (!selected.size) return alert('เลือกอย่างน้อย 1 คอลัมน์')
    setLoading('pdf')
    try {
      const { rows, rangeLabel, exportedAt, selectedCols, summary } = prepareData()
      await exportPDF(rows, selectedCols, rangeLabel, exportedAt, summary)
    } catch (e) { console.error(e); alert('Export ไม่สำเร็จ: ' + e.message) }
    setLoading(null)
  }

  const handleBilling = async () => {
    setLoading('billing')
    try {
      await exportBillingPDF(trips, trucks, companies, range, customFrom, customTo)
    } catch (e) { console.error(e); alert('Export ไม่สำเร็จ: ' + e.message) }
    setLoading(null)
  }

  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const { count } = prepareData()

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">📊 Export รายงาน</h2>
            <p className="text-xs text-gray-400 mt-0.5">พบ {count} เที่ยวในช่วงที่เลือก</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Range selector */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ช่วงเวลา</p>
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setRange(opt.key)}
                  className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                    range === opt.key
                      ? 'bg-blue-50 border-blue-400 text-blue-600 font-medium'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {range === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">วันที่เริ่ม</label>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">วันที่สิ้นสุด</label>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className={inp} />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* Billing PDF section */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">🧾 วางบิลแยกรายคัน</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  สร้าง PDF สรุปเที่ยววิ่งสำหรับวางบิล
                </p>
              </div>
              <button
                onClick={handleBilling}
                disabled={!!loading || count === 0}
                className="flex-shrink-0 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                {loading === 'billing' ? '⏳...' : '📄 Export'}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Column selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">เลือก Column (Excel / PDF)</p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                  {selected.size} / {ALL_COLUMNS.length}
                </span>
                <button onClick={toggleAll} className="text-xs text-blue-500 hover:underline">
                  {selected.size === ALL_COLUMNS.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ALL_COLUMNS.map(col => {
                const isChecked = selected.has(col.key)
                return (
                  <button
                    key={col.key}
                    onClick={() => toggleCol(col.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                      isChecked
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${
                      isChecked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}>
                      {isChecked && <span className="text-white text-xs leading-none">✓</span>}
                    </span>
                    {col.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Timestamp note */}
          <p className="text-xs text-gray-400 text-center">
            ไฟล์จะแสดง: <span className="font-medium text-gray-500">Export ณ {formatTimestamp()}</span>
          </p>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleExcel}
              disabled={!!loading || !selected.size}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {loading === 'excel' ? '⏳ กำลัง export...' : '📗 Excel (.xlsx)'}
            </button>
            <button
              onClick={handlePDF}
              disabled={!!loading || !selected.size}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {loading === 'pdf' ? '⏳ กำลัง export...' : '📕 PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}