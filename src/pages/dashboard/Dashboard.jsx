import { useEffect, useState } from 'react'
import { getTrucks } from '../../firebase/trucks'
import { getTrips } from '../../firebase/trips'
import { getInsurance } from '../../firebase/insurance'
import { Truck, TrendingUp, Clock, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// คำนวณรายรับรวมต่อ trip (ขาไป + ขากลับ + อื่นๆ)
function calcTotalIncome(trip) {
  const go = Number(trip.agreedIncome || 0) + Number(trip.otherIncome || 0)
  const ret = trip.hasReturn
    ? Number(trip.returnAgreedIncome || 0) + Number(trip.returnOtherIncome || 0)
    : 0
  return go + ret
}

export default function Dashboard() {
  const [trucks, setTrucks] = useState([])
  const [trips, setTrips] = useState([])
  const [insurance, setInsurance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [t, tr, ins] = await Promise.all([getTrucks(), getTrips(), getInsurance()])
      setTrucks(t)
      setTrips(tr)
      setInsurance(ins)
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date()

  // เฉพาะ credit ที่ยังรอรับเงิน
  const pending = trips.filter(t => t.status === 'pending' && t.paymentMode === 'credit')
  const overdue = pending.filter(t => t.dueDate && new Date(t.dueDate) < today)

  // ยอดรวม pending คิดจากรายรับรวมทุกส่วน
  const totalPending = pending.reduce((s, t) => s + calcTotalIncome(t), 0)

  const insExpiringSoon = insurance.filter(i => {
    if (!i.expireDate) return false
    const diff = (new Date(i.expireDate) - today) / (1000 * 60 * 60 * 24)
    return diff <= 30 && diff >= 0
  })

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">กำลังโหลด...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Truck} label="รถทั้งหมด" value={trucks.length} color="bg-blue-500" sub="คัน" />
        <StatCard icon={TrendingUp} label="เที่ยววิ่งทั้งหมด" value={trips.length} color="bg-green-500" sub="เที่ยว" />
        <StatCard
          icon={Clock}
          label="รอรับเงิน (เครดิต)"
          value={`฿${totalPending.toLocaleString()}`}
          color="bg-yellow-500"
          sub={`${pending.length} เที่ยว`}
        />
        <StatCard
          icon={AlertTriangle}
          label="เกินกำหนดแล้ว"
          value={overdue.length}
          color="bg-red-500"
          sub="เที่ยว"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* เที่ยวที่รอรับเงิน */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-yellow-500" />
            เครดิตรอรับเงิน
          </h2>
          {pending.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">ไม่มีรายการรอรับเงิน</p>
          ) : (
            <div className="space-y-3">
              {pending.slice(0, 5).map(trip => {
                const isOverdue = trip.dueDate && new Date(trip.dueDate) < today
                const income = calcTotalIncome(trip)
                return (
                  <div key={trip.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{trip.origin} → {trip.destination}</p>
                      {trip.hasReturn && (
                        <p className="text-xs text-orange-500">🟠 + ขากลับ</p>
                      )}
                      <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                        ครบกำหนด: {trip.dueDate || '-'}
                        {isOverdue && ' ⚠️ เกินกำหนด'}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      ฿{income.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ประกันใกล้หมดอายุ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            ประกันใกล้หมดอายุ (30 วัน)
          </h2>
          {insExpiringSoon.length === 0 ? (
            <div className="flex flex-col items-center py-4 text-gray-400">
              <CheckCircle size={32} className="text-green-400 mb-2" />
              <p className="text-sm">ประกันทุกคันปกติดี</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insExpiringSoon.map(ins => (
                <div key={ins.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{ins.type === 'compulsory' ? 'พรบ.' : 'ประกันภัย'}</p>
                    <p className="text-xs text-orange-500">หมดอายุ: {ins.expireDate}</p>
                  </div>
                  <span className="text-xs text-gray-500">{ins.company}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}