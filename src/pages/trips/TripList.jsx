import { useEffect, useState } from 'react'
import { getTrips, addTrip, updateTrip, deleteTrip, markTripReceived } from '../../firebase/trips'
import { getTrucks } from '../../firebase/trucks'
import { getCompanies } from '../../firebase/companies'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/shared/Modal'
import { Plus, Pencil, Trash2, Navigation, CheckCircle } from 'lucide-react'

const emptyExpenses = {
  fuelLiters: '', fuelPricePerLiter: '', fuel: '',
  driver: '', toll: '', bridge: '',
  oilChange: '', tire: '', other: ''
}

const emptyForm = {
  truckId: '', companyId: '', origin: '', destination: '',
  tripDate: '', agreedIncome: '', otherIncome: '', otherIncomeNote: '',
  paymentMode: 'cash', creditDays: '15', dueDate: '', status: 'pending',
  hasReturn: false,
  returnOrigin: '', returnDestination: '',
  returnAgreedIncome: '', returnOtherIncome: '', returnOtherIncomeNote: '',
  expenses: { ...emptyExpenses },
  note: ''
}

// วันวางบิล = วันที่ 1 ของเดือนถัดไปจากวันที่วิ่งงาน
function calcBillingDate(tripDate) {
  if (!tripDate) return ''
  const d = new Date(tripDate)
  // ไปเดือนถัดไป วันที่ 1
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0]
}

// ครบกำหนดรับเงิน = วันวางบิล + creditDays
function calcDueDate(tripDate, creditDays) {
  if (!tripDate || !creditDays) return ''
  const billing = new Date(calcBillingDate(tripDate))
  billing.setDate(billing.getDate() + parseInt(creditDays))
  return billing.toISOString().split('T')[0]
}

const totalExp = (exp = {}) =>
  ['fuel', 'driver', 'toll', 'bridge', 'oilChange', 'tire', 'other']
    .reduce((s, k) => s + (Number(exp[k]) || 0), 0)

export default function TripList() {
  const { userData } = useAuth()
  const isAdmin = userData?.role === 'admin'
  const [trips, setTrips] = useState([])
  const [trucks, setTrucks] = useState([])
  const [companies, setCompanies] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [receiveTrip, setReceiveTrip] = useState(null)
  const [receiveDate, setReceiveDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [filterTruck, setFilterTruck] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [toast, setToast] = useState(null)
  const toastTimerRef = typeof window !== 'undefined' ? { current: null } : { current: null }

  function showToast(msg, type = 'success') {
    setToast({ msg, type, id: Date.now() })
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3200)
  }

  async function load() {
    const [tr, tk, co] = await Promise.all([getTrips(), getTrucks(), getCompanies()])
    setTrips(tr); setTrucks(tk); setCompanies(co)
  }
  useEffect(() => { load() }, [])

  function openAdd() { setForm(emptyForm); setEditId(null); setShowModal(true) }
  function openEdit(trip) {
    setForm({
      ...emptyForm,
      ...trip,
      expenses: { ...emptyExpenses, ...(trip.expenses || {}) }
    })
    setEditId(trip.id)
    setShowModal(true)
  }

  function setF(k, v) {
    setForm(p => {
      const updated = { ...p, [k]: v }
      if ((k === 'tripDate' || k === 'creditDays') && updated.paymentMode === 'credit') {
        updated.billingDate = calcBillingDate(updated.tripDate)
        updated.dueDate = calcDueDate(updated.tripDate, updated.creditDays)
      }
      if (k === 'paymentMode' && v === 'cash') { updated.billingDate = ''; updated.dueDate = '' }
      if (k === 'paymentMode' && v === 'credit' && updated.tripDate) {
        updated.billingDate = calcBillingDate(updated.tripDate)
        updated.dueDate = calcDueDate(updated.tripDate, updated.creditDays)
      }
      if (k === 'hasReturn' && v === true) {
        updated.returnOrigin = p.destination || ''
        updated.returnDestination = p.origin || ''
      }
      return updated
    })
  }

  function setExp(k, v) {
    setForm(p => {
      const updated = { ...p.expenses, [k]: v }
      if (k === 'fuelLiters' || k === 'fuelPricePerLiter') {
        const liters = Number(k === 'fuelLiters' ? v : updated.fuelLiters) || 0
        const price = Number(k === 'fuelPricePerLiter' ? v : updated.fuelPricePerLiter) || 0
        updated.fuel = liters && price ? String(liters * price) : ''
      }
      return { ...p, expenses: updated }
    })
  }

  async function handleSave() {
    setLoading(true)
    if (editId) await updateTrip(editId, form)
    else await addTrip({ ...form, driverId: userData?.uid || '' })
    await load()
    setShowModal(false)
    setLoading(false)
    showToast(editId ? 'แก้ไขข้อมูลเรียบร้อยแล้ว' : 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success')
  }

  async function handleDelete(id) {
    if (!confirm('ยืนยันการลบเที่ยวนี้?')) return
    await deleteTrip(id)
    await load()
  }

  async function handleReceive() {
    if (!receiveDate) return
    await markTripReceived(receiveTrip.id, receiveDate)
    await load()
    setShowReceiveModal(false)
    showToast('บันทึกการรับเงินเรียบร้อยแล้ว', 'success')
  }

  const filtered = trips.filter(t => {
    if (filterTruck && t.truckId !== filterTruck) return false
    if (filterStatus && t.status !== filterStatus) return false
    return true
  }).sort((a, b) => (b.tripDate || '').localeCompare(a.tripDate || ''))

  const statusBadge = (t) => {
    const today = new Date()
    if (t.status === 'received') return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">รับแล้ว</span>
    if (t.paymentMode === 'cash') return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">เงินสด</span>
    const overdue = t.dueDate && new Date(t.dueDate) < today
    if (overdue) return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">⚠️ เกินกำหนด</span>
    return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">รอรับเงิน</span>
  }

  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const inpOrange = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"

  return (
    <div>
      {/* Toast Popup */}
      {toast && (
        <div
          key={toast.id}
          style={{
            position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, minWidth: '260px', maxWidth: '340px',
            animation: 'toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          <style>{`
            @keyframes toastIn {
              from { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(0.92); }
              to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1);    }
            }
            @keyframes toastProgress {
              from { width: 100%; }
              to   { width: 0%; }
            }
          `}</style>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07)',
            overflow: 'hidden',
            border: '1px solid #e5f7ee',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px' }}>
              {/* Icon circle */}
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '18px',
              }}>✓</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#166534' }}>สำเร็จ!</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#4b5563', marginTop: '1px' }}>{toast.msg}</p>
              </div>
              <button
                onClick={() => setToast(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', padding: '0 2px', lineHeight: 1 }}
              >×</button>
            </div>
            {/* Progress bar */}
            <div style={{ height: '3px', background: '#dcfce7' }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                animation: 'toastProgress 3.2s linear forwards',
              }} />
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">เที่ยววิ่ง</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus size={18} /> เพิ่มเที่ยว
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-4">
        <select value={filterTruck} onChange={e => setFilterTruck(e.target.value)} className={inp}>
          <option value="">ทุกคัน</option>
          {trucks.map(t => <option key={t.id} value={t.id}>{t.plate}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inp}>
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอรับเงิน</option>
          <option value="received">รับแล้ว</option>
        </select>
      </div>

      {/* Trip Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm">
          <Navigation size={48} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีข้อมูลเที่ยววิ่ง</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(trip => {
            const truck = trucks.find(t => t.id === trip.truckId)
            const company = companies.find(c => c.id === trip.companyId)
            const exp = totalExp(trip.expenses)
            const incomeGo = Number(trip.agreedIncome || 0) + Number(trip.otherIncome || 0)
            const incomeReturn = trip.hasReturn
              ? Number(trip.returnAgreedIncome || 0) + Number(trip.returnOtherIncome || 0)
              : 0
            const totalIncome = incomeGo + incomeReturn
            const profit = totalIncome - exp

            return (
              <div key={trip.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">ขาไป</span>
                      <span className="font-bold text-gray-800">{trip.origin} → {trip.destination}</span>
                      {statusBadge(trip)}
                    </div>
                    {trip.hasReturn && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium">ขากลับ</span>
                        <span className="font-semibold text-gray-700">
                          {trip.returnOrigin || trip.destination} → {trip.returnDestination || trip.origin}
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-gray-500">{truck?.plate} | {company?.name || '-'} | {trip.tripDate}</p>
                    {trip.expenses?.fuelLiters && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        ⛽ {trip.expenses.fuelLiters} ลิตร × ฿{trip.expenses.fuelPricePerLiter}/ลิตร = ฿{Number(trip.expenses.fuel).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {trip.status === 'pending' && trip.paymentMode === 'credit' && (
                      <button onClick={() => { setReceiveTrip(trip); setReceiveDate(''); setShowReceiveModal(true) }}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                        <CheckCircle size={15} />
                      </button>
                    )}
                    <button onClick={() => openEdit(trip)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Pencil size={15} />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(trip.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">ค่าจ้างรวม</p>
                    <p className="font-bold text-green-600">฿{totalIncome.toLocaleString()}</p>
                    {(trip.otherIncome || trip.hasReturn) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {trip.hasReturn
                          ? `ไป ฿${(Number(trip.agreedIncome||0)+Number(trip.otherIncome||0)).toLocaleString()} / กลับ ฿${(Number(trip.returnAgreedIncome||0)+Number(trip.returnOtherIncome||0)).toLocaleString()}`
                          : `+฿${Number(trip.otherIncome).toLocaleString()} ${trip.otherIncomeNote || 'รายรับอื่นๆ'}`
                        }
                      </p>
                    )}
                  </div>
                  <div className="bg-red-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">รายจ่าย</p>
                    <p className="font-bold text-red-500">฿{exp.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-lg p-2 text-center ${profit >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                    <p className="text-xs text-gray-500">กำไร</p>
                    <p className={`font-bold ${profit >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>฿{profit.toLocaleString()}</p>
                  </div>
                </div>

                {trip.paymentMode === 'credit' && trip.dueDate && (
                  <p className="text-xs text-gray-400 mt-2">
                    📅 วางบิล: {trip.billingDate || calcBillingDate(trip.tripDate)} &nbsp;|&nbsp; ครบกำหนด: {trip.dueDate}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editId ? 'แก้ไขเที่ยววิ่ง' : 'เพิ่มเที่ยววิ่ง'} onClose={() => setShowModal(false)} size="lg">
          <div className="space-y-4">

            {/* ข้อมูลพื้นฐาน */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รถ</label>
                <select value={form.truckId} onChange={e => setF('truckId', e.target.value)} className={inp}>
                  <option value="">เลือกรถ</option>
                  {trucks.map(t => <option key={t.id} value={t.id}>{t.plate}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">บริษัทซัพ</label>
                <select value={form.companyId} onChange={e => setF('companyId', e.target.value)} className={inp}>
                  <option value="">เลือกบริษัท</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่วิ่ง</label>
                <input type="date" value={form.tripDate} onChange={e => setF('tripDate', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">โหมดรับเงิน</label>
                <div className="flex gap-3 mt-1">
                  {[['cash','💵 เงินสด'],['credit','📄 เครดิต']].map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value={val} checked={form.paymentMode === val} onChange={e => setF('paymentMode', e.target.value)} />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {form.paymentMode === 'credit' && (
              <div className="bg-yellow-50 p-3 rounded-lg space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">เครดิต (วัน)</label>
                    <select value={form.creditDays} onChange={e => setF('creditDays', e.target.value)} className={inp}>
                      {['15','30','60','90'].map(d => <option key={d} value={d}>{d} วัน</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">วันวางบิล</label>
                    <input type="date" value={form.billingDate || calcBillingDate(form.tripDate)} readOnly className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm" />
                    <p className="text-xs text-gray-400 mt-0.5">วันที่ 1 เดือนถัดไป</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ครบกำหนดรับเงิน</label>
                    <input type="date" value={form.dueDate} readOnly className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm" />
                    <p className="text-xs text-gray-400 mt-0.5">วางบิล + {form.creditDays} วัน</p>
                  </div>
                </div>
              </div>
            )}

            {/* ====== ขาไป ====== */}
            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30">
              <p className="text-sm font-bold text-blue-700 mb-3">🔵 ขาไป</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ต้นทาง</label>
                  <input type="text" value={form.origin} onChange={e => setF('origin', e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ปลายทาง</label>
                  <input type="text" value={form.destination} onChange={e => setF('destination', e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ค่าจ้างที่ตกลง (บาท)</label>
                  <input type="text" inputMode="numeric" value={form.agreedIncome} onChange={e => setF('agreedIncome', e.target.value)} className={inp} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">รายรับอื่นๆ (บาท)</label>
                  <input type="text" inputMode="numeric" value={form.otherIncome} onChange={e => setF('otherIncome', e.target.value)} className={inp} placeholder="0" />
                </div>
                {form.otherIncome ? (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">ระบุรายรับอื่นๆ</label>
                    <input type="text" value={form.otherIncomeNote} onChange={e => setF('otherIncomeNote', e.target.value)} className={inp} placeholder="เช่น ค่าคลุมผ้าใบ" />
                  </div>
                ) : null}
              </div>
            </div>

            {/* ====== Toggle ขากลับ ====== */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div onClick={() => setF('hasReturn', !form.hasReturn)}
                className={`w-11 h-6 rounded-full transition-colors ${form.hasReturn ? 'bg-orange-500' : 'bg-gray-300'} relative`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.hasReturn ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">มีขากลับด้วย</span>
            </label>

            {/* ====== ขากลับ ====== */}
            {form.hasReturn && (
              <div className="border border-orange-200 rounded-xl p-4 bg-orange-50/30">
                <p className="text-sm font-bold text-orange-600 mb-3">🟠 ขากลับ</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ต้นทาง</label>
                    <input type="text" value={form.returnOrigin} onChange={e => setF('returnOrigin', e.target.value)} className={inpOrange} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ปลายทาง</label>
                    <input type="text" value={form.returnDestination} onChange={e => setF('returnDestination', e.target.value)} className={inpOrange} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ค่าจ้างที่ตกลง (บาท)</label>
                    <input type="text" inputMode="numeric" value={form.returnAgreedIncome} onChange={e => setF('returnAgreedIncome', e.target.value)} className={inpOrange} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">รายรับอื่นๆ (บาท)</label>
                    <input type="text" inputMode="numeric" value={form.returnOtherIncome} onChange={e => setF('returnOtherIncome', e.target.value)} className={inpOrange} placeholder="0" />
                  </div>
                  {form.returnOtherIncome ? (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">ระบุรายรับอื่นๆ</label>
                      <input type="text" value={form.returnOtherIncomeNote} onChange={e => setF('returnOtherIncomeNote', e.target.value)} className={inpOrange} placeholder="เช่น ค่าคลุมผ้าใบ" />
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* ====== รายจ่ายรวม 1 ชุด ====== */}
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">รายจ่ายต่อเที่ยว (บาท)</p>
              <div className="grid grid-cols-2 gap-3">

                {/* น้ำมัน */}
                <div className="col-span-2 border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                  <label className="block text-xs font-medium text-gray-600 mb-2">⛽ น้ำมัน</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">จำนวน (ลิตร)</label>
                      <input type="text" inputMode="numeric"
                        value={form.expenses.fuelLiters}
                        onChange={e => setExp('fuelLiters', e.target.value)}
                        className={inp} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">ราคา/ลิตร (บาท)</label>
                      <input type="text" inputMode="numeric"
                        value={form.expenses.fuelPricePerLiter}
                        onChange={e => setExp('fuelPricePerLiter', e.target.value)}
                        className={inp} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">รวม (บาท)</label>
                      <input type="text" readOnly
                        value={form.expenses.fuel ? Number(form.expenses.fuel).toLocaleString() : '0'}
                        className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm font-bold text-red-500" />
                    </div>
                  </div>
                </div>

                {/* รายจ่ายอื่นๆ */}
                {[
                  ['driver','ค่าคนขับ'],['toll','ค่าทางด่วน'],
                  ['bridge','ค่าข้ามสะพาน/ด่าน'],['oilChange','ค่าถ่ายน้ำมันเครื่อง'],
                  ['tire','ค่าปะ/เปลี่ยนยาง'],['other','อื่นๆ']
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input type="text" inputMode="numeric"
                      value={form.expenses[key]}
                      onChange={e => setExp(key, e.target.value)}
                      className={inp} placeholder="0" />
                  </div>
                ))}
              </div>

              <div className="mt-3 bg-gray-50 rounded-lg p-3 flex justify-between">
                <span className="text-sm text-gray-600">รวมรายจ่าย</span>
                <span className="font-bold text-red-500">฿{totalExp(form.expenses).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
              <textarea value={form.note} onChange={e => setF('note', e.target.value)} rows={2} className={inp} />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">ยกเลิก</button>
            <button onClick={handleSave} disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </Modal>
      )}

      {/* Mark Received Modal */}
      {showReceiveModal && receiveTrip && (
        <Modal title="ยืนยันรับเงิน" onClose={() => setShowReceiveModal(false)} size="sm">
          <div className="text-sm text-gray-600 mb-4 space-y-1">
            <p className="font-medium text-gray-800">{receiveTrip.origin} → {receiveTrip.destination}</p>
            {receiveTrip.hasReturn && (
              <p className="text-xs text-orange-600">🟠 ขากลับ: {receiveTrip.returnOrigin || receiveTrip.destination} → {receiveTrip.returnDestination || receiveTrip.origin}</p>
            )}
            <p className="text-green-600 font-bold text-base">
              ฿{(
                Number(receiveTrip.agreedIncome || 0) +
                Number(receiveTrip.otherIncome || 0) +
                (receiveTrip.hasReturn ? Number(receiveTrip.returnAgreedIncome || 0) + Number(receiveTrip.returnOtherIncome || 0) : 0)
              ).toLocaleString()}
              {receiveTrip.hasReturn && (
                <span className="text-xs text-gray-400 font-normal ml-2">
                  (ไป ฿{(Number(receiveTrip.agreedIncome||0)+Number(receiveTrip.otherIncome||0)).toLocaleString()} + กลับ ฿{(Number(receiveTrip.returnAgreedIncome||0)+Number(receiveTrip.returnOtherIncome||0)).toLocaleString()})
                </span>
              )}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่รับเงินจริง</label>
            <input type="date" value={receiveDate} onChange={e => setReceiveDate(e.target.value)} className={inp} />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowReceiveModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">ยกเลิก</button>
            <button onClick={handleReceive} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700">
              ✅ ยืนยันรับเงินแล้ว
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}