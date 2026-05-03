import { useEffect, useState } from 'react'
import { getTrips } from '../../firebase/trips'
import { getTrucks } from '../../firebase/trucks'
import { getCompanies } from '../../firebase/companies'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

function calcTotalIncome(trip) {
  const go = Number(trip.agreedIncome || 0) + Number(trip.otherIncome || 0)
  const ret = trip.hasReturn
    ? Number(trip.returnAgreedIncome || 0) + Number(trip.returnOtherIncome || 0)
    : 0
  return go + ret
}

function calcBillingDate(tripDate) {
  if (!tripDate) return ''
  const d = new Date(tripDate)
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0]
}

function calcDueDate(tripDate, creditDays = 15) {
  if (!tripDate) return ''
  const billing = new Date(calcBillingDate(tripDate))
  billing.setDate(billing.getDate() + parseInt(creditDays))
  return billing.toISOString().split('T')[0]
}

function fmtDate(dateStr) {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${parseInt(y) + 543}`
}

export default function Reports() {
  const [trips, setTrips] = useState([])
  const [trucks, setTrucks] = useState([])
  const [companies, setCompanies] = useState([])
  const [selectedTruck, setSelectedTruck] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    async function load() {
      const [tr, tk, co] = await Promise.all([getTrips(), getTrucks(), getCompanies()])
      setTrips(tr); setTrucks(tk); setCompanies(co)
    }
    load()
  }, [])

  const totalExp = (exp = {}) =>
    ['fuel','driver','toll','bridge','oilChange','tire','other'].reduce((s, k) => s + (Number(exp[k]) || 0), 0)

  // Overview
  const filteredTrips = trips.filter(t => {
    if (selectedTruck && t.truckId !== selectedTruck) return false
    if (!t.tripDate) return false
    return new Date(t.tripDate).getFullYear() === selectedYear
  })

  const chartData = MONTHS.map((month, i) => {
    const monthTrips = filteredTrips.filter(t => new Date(t.tripDate).getMonth() === i)
    const income = monthTrips.reduce((s, t) => s + calcTotalIncome(t), 0)
    const expense = monthTrips.reduce((s, t) => s + totalExp(t.expenses), 0)
    return { month, income, expense, profit: income - expense }
  })

  const truckSummary = trucks.map(truck => {
    const truckTrips = filteredTrips.filter(t => t.truckId === truck.id)
    const income = truckTrips.reduce((s, t) => s + calcTotalIncome(t), 0)
    const expense = truckTrips.reduce((s, t) => s + totalExp(t.expenses), 0)
    return { truck, trips: truckTrips.length, income, expense, profit: income - expense }
  }).filter(s => s.trips > 0)

  const totalIncome = filteredTrips.reduce((s, t) => s + calcTotalIncome(t), 0)
  const totalExpense = filteredTrips.reduce((s, t) => s + totalExp(t.expenses), 0)
  const totalProfit = totalIncome - totalExpense

  // Monthly
  const monthlyTrips = trips.filter(t => {
    if (!t.tripDate) return false
    const d = new Date(t.tripDate)
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
  }).sort((a, b) => (a.tripDate || '').localeCompare(b.tripDate || ''))

  const truckGroups = trucks
    .map(truck => {
      const tTrips = monthlyTrips.filter(t => t.truckId === truck.id)
      if (tTrips.length === 0) return null
      const totalIncomeTruck = tTrips.reduce((s, t) => s + calcTotalIncome(t), 0)
      const creditTotal = tTrips
        .filter(t => t.paymentMode === 'credit')
        .reduce((s, t) => s + calcTotalIncome(t), 0)
      return { truck, trips: tTrips, totalIncome: totalIncomeTruck, creditTotal }
    })
    .filter(Boolean)

  const grandIncome = truckGroups.reduce((s, g) => s + g.totalIncome, 0)
  const grandCredit = truckGroups.reduce((s, g) => s + g.creditTotal, 0)

  const inp = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">รายงาน</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          📊 ภาพรวมรายปี
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'monthly' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          🚛 รายการวิ่งรายเดือน
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          <div className="flex gap-3 mb-6 flex-wrap">
            <select value={selectedTruck} onChange={e => setSelectedTruck(e.target.value)} className={inp}>
              <option value="">ทุกคัน</option>
              {trucks.map(t => <option key={t.id} value={t.id}>{t.plate}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className={inp}>
              {[2567, 2568, 2569].map(y => <option key={y} value={y - 543}>{y}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-1">รายรับรวม</p>
              <p className="text-xl font-bold text-green-600">฿{totalIncome.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-1">รายจ่ายรวม</p>
              <p className="text-xl font-bold text-red-500">฿{totalExpense.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl p-4 shadow-sm border text-center ${totalProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
              <p className="text-xs text-gray-500 mb-1">กำไรสุทธิ</p>
              <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>฿{totalProfit.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
            <h2 className="font-bold text-gray-700 mb-4">กราฟรายรับ-รายจ่าย รายเดือน</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `฿${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="income" name="รายรับ" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="expense" name="รายจ่าย" fill="#ef4444" radius={[4,4,0,0]} />
                <Bar dataKey="profit" name="กำไร" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {truckSummary.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-700 mb-4">สรุปแยกตามรถ</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-gray-500 font-medium">ทะเบียน</th>
                      <th className="text-right py-2 text-gray-500 font-medium">จำนวนเที่ยว</th>
                      <th className="text-right py-2 text-gray-500 font-medium">รายรับ</th>
                      <th className="text-right py-2 text-gray-500 font-medium">รายจ่าย</th>
                      <th className="text-right py-2 text-gray-500 font-medium">กำไร</th>
                    </tr>
                  </thead>
                  <tbody>
                    {truckSummary.sort((a, b) => b.profit - a.profit).map(s => (
                      <tr key={s.truck.id} className="border-b border-gray-50">
                        <td className="py-2 font-medium text-gray-800">{s.truck.plate}</td>
                        <td className="text-right py-2 text-gray-600">{s.trips}</td>
                        <td className="text-right py-2 text-green-600 font-medium">฿{s.income.toLocaleString()}</td>
                        <td className="text-right py-2 text-red-500 font-medium">฿{s.expense.toLocaleString()}</td>
                        <td className={`text-right py-2 font-bold ${s.profit >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>฿{s.profit.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MONTHLY TAB */}
      {activeTab === 'monthly' && (
        <>
          <div className="flex gap-3 mb-6 flex-wrap items-center">
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className={inp}>
              {MONTHS_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className={inp}>
              {[2567, 2568, 2569].map(y => <option key={y} value={y - 543}>{y}</option>)}
            </select>
          </div>

          {/* Header banner */}
          <div className="bg-blue-600 text-white rounded-xl px-6 py-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-200 mb-0.5">รายการวิ่งประจำเดือน</p>
              <p className="text-xl font-bold">{MONTHS_FULL[selectedMonth]} {selectedYear + 543}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-200 mb-0.5">รวม {monthlyTrips.length} เที่ยว / {truckGroups.length} คัน</p>
              <p className="text-lg font-bold">฿{grandIncome.toLocaleString()}</p>
              {grandCredit > 0 && <p className="text-xs text-yellow-300">เครดิตรอรับ ฿{grandCredit.toLocaleString()}</p>}
            </div>
          </div>

          {truckGroups.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center text-gray-400 shadow-sm border border-gray-100">
              ไม่มีข้อมูลการวิ่งงานในเดือนนี้
            </div>
          ) : (
            <div className="space-y-6">
              {truckGroups.map(({ truck, trips: tTrips, totalIncome: truckIncome, creditTotal }) => {
                const creditTrip = tTrips.find(t => t.paymentMode === 'credit')
                const billingDate = creditTrip
                  ? (creditTrip.billingDate || calcBillingDate(creditTrip.tripDate))
                  : null
                const dueDate = creditTrip
                  ? (creditTrip.dueDate || calcDueDate(creditTrip.tripDate, creditTrip.creditDays || 15))
                  : null

                return (
                  <div key={truck.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Truck header */}
                    <div className="flex items-center justify-between bg-gray-50 border-b border-gray-100 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🚛</span>
                        <div>
                          <p className="font-bold text-gray-800 text-lg">{truck.plate}</p>
                          {truck.type && <p className="text-xs text-gray-400">{truck.type}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{tTrips.length} เที่ยว</p>
                        <p className="font-bold text-green-600 text-base">฿{truckIncome.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Trip table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="text-center py-2 px-3 text-gray-400 font-medium text-xs w-8">ที่</th>
                            <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">วันที่</th>
                            <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">เส้นทาง</th>
                            <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">ลูกค้า</th>
                            <th className="text-center py-2 px-3 text-gray-400 font-medium text-xs">ชำระ</th>
                            <th className="text-right py-2 px-3 text-gray-400 font-medium text-xs">รายรับ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tTrips.map((trip, i) => {
                            const company = companies.find(c => c.id === trip.companyId)
                            const income = calcTotalIncome(trip)
                            const isCredit = trip.paymentMode === 'credit'
                            return (
                              <tr key={trip.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="text-center py-2.5 px-3 text-gray-400 text-xs">{i + 1}</td>
                                <td className="py-2.5 px-3 text-gray-600 text-xs whitespace-nowrap">{fmtDate(trip.tripDate)}</td>
                                <td className="py-2.5 px-3">
                                  <span className="text-gray-800 font-medium">{trip.origin}</span>
                                  <span className="text-gray-400 mx-1">→</span>
                                  <span className="text-gray-800 font-medium">{trip.destination}</span>
                                  {trip.hasReturn && (
                                    <span className="text-xs text-orange-500 ml-1">(ไป-กลับ)</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-gray-500 text-xs">{company?.name || '-'}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    !isCredit ? 'bg-blue-100 text-blue-600' :
                                    trip.status === 'received' ? 'bg-green-100 text-green-600' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {!isCredit ? 'สด' : trip.status === 'received' ? 'รับแล้ว' : 'เครดิต'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-gray-800">
                                  ฿{income.toLocaleString()}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 font-bold">
                            <td colSpan={5} className="py-2.5 px-3 text-gray-700 text-sm">รวม {tTrips.length} เที่ยว</td>
                            <td className="py-2.5 px-3 text-right text-green-600 text-sm">฿{truckIncome.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Credit billing info */}
                    {creditTotal > 0 && billingDate && (
                      <div className="flex items-center justify-between bg-yellow-50 border-t border-yellow-100 px-5 py-3 text-sm">
                        <div className="flex items-center gap-4 text-gray-600">
                          <span>📅 วางบิล: <strong>{fmtDate(billingDate)}</strong></span>
                          <span>⏱ ครบกำหนดรับเงิน: <strong>{fmtDate(dueDate)}</strong></span>
                        </div>
                        <span className="font-bold text-yellow-700">รอรับ ฿{creditTotal.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Grand summary */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <h3 className="font-bold text-blue-800 mb-3">📋 สรุปรวมประจำเดือน {MONTHS_FULL[selectedMonth]} {selectedYear + 543}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                    <p className="text-xs text-gray-400 mb-1">จำนวนเที่ยวทั้งหมด</p>
                    <p className="font-bold text-gray-800 text-lg">{monthlyTrips.length} เที่ยว</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                    <p className="text-xs text-gray-400 mb-1">รายรับรวม</p>
                    <p className="font-bold text-green-600 text-lg">฿{grandIncome.toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-yellow-100 text-center">
                    <p className="text-xs text-gray-400 mb-1">ยอดเครดิตรอรับ</p>
                    <p className="font-bold text-yellow-600 text-lg">฿{grandCredit.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
