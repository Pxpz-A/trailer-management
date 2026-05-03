import { useEffect, useState } from 'react'
import { getMaintenance, addMaintenance, updateMaintenance, deleteMaintenance } from '../../firebase/maintenance'
import { getTrucks } from '../../firebase/trucks'
import Modal from '../../components/shared/Modal'
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react'

const empty = { truckId: '', date: '', detail: '', garage: '', cost: '', mileage: '', note: '' }

export default function Maintenance() {
  const [list, setList] = useState([])
  const [trucks, setTrucks] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filterTruck, setFilterTruck] = useState('')

  async function load() {
    const [m, tk] = await Promise.all([getMaintenance(), getTrucks()])
    setList(m)
    setTrucks(tk)
  }
  useEffect(() => { load() }, [])

  function openAdd() { setForm(empty); setEditId(null); setShowModal(true) }
  function openEdit(item) { setForm({ ...item }); setEditId(item.id); setShowModal(true) }

  async function handleSave() {
    setLoading(true)
    if (editId) await updateMaintenance(editId, form)
    else await addMaintenance(form)
    await load()
    setShowModal(false)
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('ยืนยันการลบ?')) return
    await deleteMaintenance(id)
    await load()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const filtered = filterTruck ? list.filter(i => i.truckId === filterTruck) : list
  const totalCost = filtered.reduce((s, i) => s + (Number(i.cost) || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">ซ่อมบำรุง</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus size={18} /> เพิ่มรายการ
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={filterTruck} onChange={e => setFilterTruck(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">ทุกคัน</option>
          {trucks.map(t => <option key={t.id} value={t.id}>{t.plate}</option>)}
        </select>
        {filtered.length > 0 && (
          <div className="bg-orange-50 border border-orange-100 rounded-lg px-4 py-2 text-sm">
            ค่าซ่อมรวม: <span className="font-bold text-orange-600">฿{totalCost.toLocaleString()}</span>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm">
          <Wrench size={48} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีประวัติซ่อมบำรุง</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(item => {
            const truck = trucks.find(t => t.id === item.truckId)
            return (
              <div key={item.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="bg-orange-100 text-orange-600 p-2 rounded-lg h-fit">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{item.detail}</p>
                    <p className="text-sm text-gray-500">{truck?.plate} | {item.date} | {item.garage}</p>
                    {item.mileage && <p className="text-xs text-gray-400">เลขไมล์: {item.mileage} กม.</p>}
                    {item.note && <p className="text-xs text-gray-400 mt-1">{item.note}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-red-500 text-sm">฿{Number(item.cost || 0).toLocaleString()}</span>
                  <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <Modal title={editId ? 'แก้ไขการซ่อม' : 'เพิ่มการซ่อม'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รถ</label>
              <select value={form.truckId} onChange={e => f('truckId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">เลือกรถ</option>
                {trucks.map(t => <option key={t.id} value={t.id}>{t.plate}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[['วันที่','date','date'],['อาการ/รายละเอียด','detail','text'],['อู่/ศูนย์บริการ','garage','text'],['ค่าใช้จ่าย (บาท)','cost','number'],['เลขไมล์ (กม.)','mileage','number']].map(([label, key, type]) => (
                <div key={key} className={key === 'detail' ? 'col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={form[key]} onChange={e => f(key, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
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
