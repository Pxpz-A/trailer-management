import { useEffect, useState } from 'react'
import { getCompanies, addCompany, updateCompany, deleteCompany } from '../../firebase/companies'
import Modal from '../../components/shared/Modal'
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'

const empty = { name: '', contactName: '', phone: '', creditDays: '90', address: '', note: '' }

export default function CompanyList() {
  const [companies, setCompanies] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load() { setCompanies(await getCompanies()) }
  useEffect(() => { load() }, [])

  function openAdd() { setForm(empty); setEditId(null); setShowModal(true) }
  function openEdit(c) { setForm({ ...c }); setEditId(c.id); setShowModal(true) }

  async function handleSave() {
    setLoading(true)
    if (editId) await updateCompany(editId, form)
    else await addCompany(form)
    await load()
    setShowModal(false)
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('ยืนยันการลบบริษัทนี้?')) return
    await deleteCompany(id)
    await load()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">บริษัทซัพ</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Plus size={18} /> เพิ่มบริษัท
        </button>
      </div>

      {companies.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm">
          <Building2 size={48} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีข้อมูลบริษัท</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(c => (
            <div key={c.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{c.name}</p>
                    <p className="text-sm text-gray-500">{c.contactName}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-500">
                {c.phone && <p>📞 {c.phone}</p>}
                <p>เครดิตเทอม: <span className="font-medium text-blue-600">{c.creditDays} วัน</span></p>
                {c.note && <p className="text-xs text-gray-400">{c.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editId ? 'แก้ไขบริษัท' : 'เพิ่มบริษัท'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {[
              ['ชื่อบริษัท *', 'name'], ['ชื่อผู้ติดต่อ', 'contactName'],
              ['เบอร์โทร', 'phone'], ['ที่อยู่', 'address'],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input value={form[key]} onChange={e => f(key, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เครดิตเทอม (วัน)</label>
              <select value={form.creditDays} onChange={e => f('creditDays', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="15">15 วัน</option>
                <option value="30">30 วัน</option>
                <option value="60">60 วัน</option>
                <option value="90">90 วัน</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
              <textarea value={form.note} onChange={e => f('note', e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
    </div>
  )
}
