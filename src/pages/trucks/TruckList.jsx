import { useEffect, useState } from 'react'
import { getTrucks, addTruck, updateTruck, deleteTruck } from '../../firebase/trucks'
import Modal from '../../components/shared/Modal'
import { Plus, Pencil, Trash2, Truck } from 'lucide-react'

const empty = {
  plate: '', brand: '', model: '', year: '', color: '', chassisNumber: '',
  monthlyPayment: '', totalLoan: '', remainingLoan: '', loanEndDate: '', note: ''
}

export default function TruckList() {
  const [trucks, setTrucks] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setTrucks(await getTrucks())
  }

  useEffect(() => { load() }, [])

  function openAdd() { setForm(empty); setEditId(null); setShowModal(true) }
  function openEdit(truck) { setForm({ ...truck }); setEditId(truck.id); setShowModal(true) }

  async function handleSave() {
    setLoading(true)
    if (editId) await updateTruck(editId, form)
    else await addTruck(form)
    await load()
    setShowModal(false)
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('ยืนยันการลบรถคันนี้?')) return
    await deleteTruck(id)
    await load()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">จัดการรถ</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Plus size={18} /> เพิ่มรถ
        </button>
      </div>

      {trucks.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm">
          <Truck size={48} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีข้อมูลรถ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trucks.map(truck => (
            <div key={truck.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{truck.plate}</p>
                    <p className="text-sm text-gray-500">{truck.brand} {truck.model} {truck.year}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(truck)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(truck.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                {truck.color && <p className="text-gray-500">สี: {truck.color}</p>}
                {truck.monthlyPayment && (
                  <p className="text-gray-500">ค่างวด: <span className="text-red-500 font-medium">฿{Number(truck.monthlyPayment).toLocaleString()}/เดือน</span></p>
                )}
                {truck.remainingLoan && (
                  <p className="text-gray-500">ยอดผ่อนคงเหลือ: <span className="font-medium">฿{Number(truck.remainingLoan).toLocaleString()}</span></p>
                )}
                {truck.loanEndDate && <p className="text-gray-500">ครบสัญญา: {truck.loanEndDate}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editId ? 'แก้ไขข้อมูลรถ' : 'เพิ่มรถ'} onClose={() => setShowModal(false)} size="lg">
          <div className="grid grid-cols-2 gap-4">
            {[
              ['ทะเบียนรถ', 'plate'], ['ยี่ห้อ', 'brand'],
              ['รุ่น', 'model'], ['ปี', 'year'],
              ['สี', 'color'], ['เลขตัวถัง', 'chassisNumber'],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input value={form[key]} onChange={e => f(key, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">ข้อมูลผ่อนรถ</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['ค่างวด/เดือน (บาท)', 'monthlyPayment'], ['ยอดกู้ทั้งหมด (บาท)', 'totalLoan'],
                ['ยอดคงเหลือ (บาท)', 'remainingLoan'], ['วันครบสัญญา', 'loanEndDate'],
              ].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={key === 'loanEndDate' ? 'date' : 'text'}
                    value={form[key]}
                    onChange={e => f(key, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
            <textarea value={form.note} onChange={e => f('note', e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">ยกเลิก</button>
            <button onClick={handleSave} disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
