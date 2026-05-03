import { useEffect, useState } from 'react'
import { getTrips } from '../../firebase/trips'
import { getTrucks } from '../../firebase/trucks'
import { getCompanies } from '../../firebase/companies'
import ExportModal from './ExportModal'   // ← import ตรงนี้ (ปรับ path ตามโครงสร้างโปรเจกต์)

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

export default function Accounting() {
  const [trips, setTrips] = useState([])
  const [trucks, setTrucks] = useState([])
  const [companies, setCompanies] = useState([])
  const [selectedTruck, setSelectedTruck] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showExport, setShowExport] = useState(false)   // ← state ใหม่

  useEffect(() => {
    async function load() {
      const [tr, tk, co] = await Promise.all([getTrips(), getTrucks(), getCompanies()])
      setTrips(tr); setTrucks(tk); setCompanies(co)
    }
    load()
  }, [])

  const totalExp = (exp = {}) =>
    ['fuel','driver','toll','bridge','oilChange','tire','other']
      .reduce((s, k) => s + (Number(exp[k]) || 0), 0)

  const totalIncome = (t) =>
    (Number(t.agreedIncome) || 0) +
    (Number(t.otherIncome) || 0) +
    (t.hasReturn ? (Number(t.returnAgreedIncome) || 0) + (Number(t.returnOtherIncome) || 0) : 0)

  const filtered = trips.filter(t => {
    if (selectedTruck && t.truckId !== selectedTruck) return false
    if (!t.tripDate) return false
    const d = new Date(t.tripDate)
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
  })

  const cashIncome = filtered
    .filter(t => t.paymentMode === 'cash')
    .reduce((s, t) => s + totalIncome(t), 0)

  const creditPending = filtered
    .filter(t => t.paymentMode === 'credit' && t.status === 'pending')
    .reduce((s, t) => s + totalIncome(t), 0)

  const creditReceived = filtered
    .filter(t => t.paymentMode === 'credit' && t.status === 'received')
    .reduce((s, t) => s + totalIncome(t), 0)

  const totalExpense = filtered.reduce((s, t) => s + totalExp(t.expenses), 0)
  const cashBalance = cashIncome + creditReceived - totalExpense
  const totalProfit = cashIncome + creditPending + creditReceived - totalExpense

  const expLabels = [
    ['fuel','น้ำมัน'],['driver','ค่าคนขับ'],['toll','ค่าทางด่วน'],
    ['bridge','ค่าข้ามสะพาน/ด่าน'],['oilChange','ค่าถ่ายน้ำมันเครื่อง'],
    ['tire','ค่าปะ/เปลี่ยนยาง'],['other','อื่นๆ']
  ]

  const expSummary = expLabels.map(([key, label]) => ({
    label,
    total: filtered.reduce((s, t) => s + (Number(t.expenses?.[key]) || 0), 0)
  })).filter(e => e.total > 0)

  const inp = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">บัญชีรายรับ-รายจ่าย</h1>

        {/* ── ปุ่ม Export ── */}
        <button
          onClick={() => setShowExport(true)}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
      </div>

      {/* ── Filter ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={selectedTruck} onChange={e => setSelectedTruck(e.target.value)} className={inp}>
          <option value="">ทุกคัน</option>
          {trucks.map(t => <option key={t.id} value={t.id}>{t.plate}</option>)}
        </select>
        <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className={inp}>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className={inp}>
          {[2567, 2568, 2569].map(y => <option key={y} value={y - 543}>{y}</option>)}
        </select>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">รายรับเงินสด</p>
          <p className="text-xl font-bold text-green-600">฿{cashIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">เครดิตรอรับ</p>
          <p className="text-xl font-bold text-yellow-500">฿{creditPending.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">รายจ่ายรวม</p>
          <p className="text-xl font-bold text-red-500">฿{totalExpense.toLocaleString()}</p>
        </div>
        <div className={`rounded-xl p-4 shadow-sm border ${totalProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <p className="text-xs text-gray-500 mb-1">กำไรสุทธิ (รวมเครดิต)</p>
          <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
            ฿{totalProfit.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* สรุปบัญชี */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-4">📒 สรุปบัญชีเดือนนี้</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">+ รับเงินสด (รวมขาไป-กลับ)</span>
              <span className="font-medium text-green-600">฿{cashIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">+ รับจากซัพ (เครดิต รับแล้ว)</span>
              <span className="font-medium text-green-600">฿{creditReceived.toLocaleString()}</span>
            </div>
            {expSummary.map(e => (
              <div key={e.label} className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-600">- {e.label}</span>
                <span className="font-medium text-red-500">฿{e.total.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 mt-2 bg-gray-50 rounded-lg px-2">
              <span className="font-bold text-gray-700">เงินคงเหลือ (สด)</span>
              <span className={`font-bold ${cashBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                ฿{cashBalance.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-1 px-2">
              <span className="text-gray-500 text-xs">💳 รอรับจากซัพ (เครดิต)</span>
              <span className="text-yellow-600 font-medium text-xs">฿{creditPending.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* รายละเอียดต่อเที่ยว */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-4">🚛 รายละเอียดต่อเที่ยว ({filtered.length} เที่ยว)</h2>
          {filtered.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">ไม่มีข้อมูลในเดือนนี้</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {filtered.map((trip, i) => {
                const exp = totalExp(trip.expenses)
                const income = totalIncome(trip)
                const profit = income - exp
                const company = companies.find(c => c.id === trip.companyId)
                return (
                  <div key={trip.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        รอบที่ {i + 1} — {trip.origin} → {trip.destination}
                        {trip.hasReturn && (
                          <span className="ml-1 text-xs text-orange-500">
                            / {trip.returnOrigin || trip.destination} → {trip.returnDestination || trip.origin}
                          </span>
                        )}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        trip.paymentMode === 'cash'
                          ? 'bg-blue-100 text-blue-600'
                          : trip.status === 'received'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {trip.paymentMode === 'cash' ? 'สด' : trip.status === 'received' ? 'รับแล้ว' : 'รอรับ'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{company?.name} | {trip.tripDate}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs text-center">
                      <div className="bg-green-50 rounded p-1">
                        <p className="text-gray-400">ค่าจ้างรวม</p>
                        <p className="font-bold text-green-600">฿{income.toLocaleString()}</p>
                        {trip.hasReturn && <p className="text-gray-400 text-xs">ไป+กลับ</p>}
                      </div>
                      <div className="bg-red-50 rounded p-1">
                        <p className="text-gray-400">จ่าย</p>
                        <p className="font-bold text-red-500">฿{exp.toLocaleString()}</p>
                      </div>
                      <div className={`rounded p-1 ${profit >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                        <p className="text-gray-400">กำไร</p>
                        <p className={`font-bold ${profit >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
                          ฿{profit.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Export Modal ── */}
      {showExport && (
        <ExportModal
          trips={trips}
          trucks={trucks}
          companies={companies}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}