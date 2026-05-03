import { useEffect, useState } from 'react'
import { getInsurance, addInsurance, updateInsurance, deleteInsurance } from '../../firebase/insurance'
import { getTrucks } from '../../firebase/trucks'
import Modal from '../../components/shared/Modal'
import { Plus, Pencil, Trash2, Shield, AlertTriangle, CheckCircle } from 'lucide-react'

const empty = {
  truckId: '', type: 'compulsory', company: '', startDate: '', expireDate: '',
  coverage: '', premium: '', taxDueDate: '', taxCost: '', note: ''
}

function getDaysLeft(dateStr) {
  if (!dateStr) return null
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)
  return Math.ceil(diff)
}

export default function Insurance() {
  const [list, setList] = useState([])
  const [trucks, setTrucks] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filterTruck, setFilterTruck] = useState('')

  async function load() {
    const [ins, tk] = await Promise.all([getInsurance(), getTrucks()])
    setList(ins)
    setTrucks(tk)
  }
  useEffect(() => { load() }, [])

  function openAdd() { setForm(empty); setEditId(null); setShowModal(true) }
  function openEdit(item) { setForm({ ...item }); setEditId(item.id); setShowModal(true) }

  async function handleSave() {
    setLoading(true)
    if (editId) await updateInsurance(editId, form)
    else await addInsurance(form)
    await load()
    setShowModal(false)
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('ยืนยันการลบ?')) return
    await deleteInsurance(id)
    await load()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const filtered = filterTruck ? list.filter(i => i.truckId === filterTruck) : list

  function statusBadge(expireDate) {
    const days = getDaysLeft(expireDate)
    if (days === null) return null
    if (days < 0) return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">❌ หมดแล้ว</span>
    if (days <= 30) return <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full">⚠️ เหลือ {days} วัน</span>
    return <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">✅ ปกติ</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">ประกันภัย / ภาษีรถ</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus size={18} /> เพิ่มรายการ
        </button>
      </div>

      <div className="mb-4">
        <select value={filterTruck} onChange={e => setFilterTruck(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">ทุกคัน</option>
          {trucks.map(t => <option key={t.id} value={t.id}>{t.plate}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm">
          <Shield size={48} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีข้อมูลประกัน</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(item => {
            const truck = trucks.find(t => t.id === item.truckId)
            return (
              <div key={item.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-800">
                        {item.type === 'compulsory' ? '🛡️ พรบ.' : item.type === 'voluntary' ? '🔐 ประกันภาคสมัครใจ' : '📋 ภาษีรถ'}
                      </span>
                      {statusBadge(item.expireDate || item.taxDueDate)}
                    </div>
                    <p className="text-sm text-gray-500">{truck?.plate} | {item.company}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-500">
                  {item.startDate && <p>เริ่ม: {item.startDate}</p>}
                  {item.expireDate && <p>หมดอายุ: {item.expireDate}</p>}
                  {item.taxDueDate && <p>ครบกำหนดภาษี: {item.taxDueDate}</p>}
                  {item.coverage && <p>ทุนประกัน: ฿{Number(item.coverage).toLocaleString()}</p>}
                  {item.premium && <p>เบี้ยประกัน: ฿{Number(item.premium).toLocaleString()}</p>}
                  {item.taxCost && <p>ค่าภาษี: ฿{Number(item.taxCost).toLocaleString()}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <Modal title={editId ? 'แก้ไข' : 'เพิ่มประกัน/ภาษี'} onClose={() => setShowModal(false)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รถ</label>
                <select value={form.truckId} onChange={e => f('truckId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">เลือกรถ</option>
                  {trucks.map(t => <option key={t.id} value={t.id}>{t.plate}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                <select value={form.type} onChange={e => f('type', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="compulsory">พรบ.</option>
                  <option value="voluntary">ประกันภาคสมัครใจ</option>
                  <option value="tax">ภาษีรถ</option>
                </select>
              </div>
            </div>
            {['compulsory','voluntary'].includes(form.type) && (
              <div className="grid grid-cols-2 gap-4">
                {[['บริษัทประกัน','company'],['วันเริ่มคุ้มครอง','startDate'],['วันหมดอายุ','expireDate'],['ทุนประกัน (บาท)','coverage'],['เบี้ยประกัน (บาท)','premium']].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input type={key.includes('Date') ? 'date' : 'text'} value={form[key]} onChange={e => f(key, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            )}
            {form.type === 'tax' && (
              <div className="grid grid-cols-2 gap-4">
                {[['ครบกำหนดภาษี','taxDueDate'],['ค่าภาษี (บาท)','taxCost']].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input type={key.includes('Date') ? 'date' : 'text'} value={form[key]} onChange={e => f(key, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
              <textarea value={form.note} onChange={e => f('note', e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">ยกเลิก</button>
            <button onClick={handleSave} disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
