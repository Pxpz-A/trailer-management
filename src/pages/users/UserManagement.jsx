import { useEffect, useState } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '../../firebase/auth'
import Modal from '../../components/shared/Modal'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'

const empty = { name: '', email: '', password: '', role: 'employee', phone: '' }

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() { setUsers(await getUsers()) }
  useEffect(() => { load() }, [])

  function openAdd() { setForm(empty); setEditId(null); setError(''); setShowModal(true) }
  function openEdit(u) { setForm({ ...u, password: '' }); setEditId(u.id); setError(''); setShowModal(true) }

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      if (editId) {
        await updateUser(editId, { name: form.name, role: form.role, phone: form.phone })
      } else {
        if (!form.email || !form.password) return setError('กรุณากรอกอีเมลและรหัสผ่าน')
        await createUser(form.email, form.password, form.name, form.role, form.phone)
      }
      await load()
      setShowModal(false)
    } catch (e) {
      setError(e.message || 'เกิดข้อผิดพลาด')
    }
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('ยืนยันการลบผู้ใช้นี้?')) return
    await deleteUser(id)
    await load()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus size={18} /> เพิ่มผู้ใช้
        </button>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีผู้ใช้</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">ชื่อ</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">อีเมล</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">เบอร์</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">บทบาท</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3 text-gray-500">{u.phone || '-'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editId ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'} onClose={() => setShowModal(false)}>
          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">{error}</div>}
          <div className="space-y-4">
            {[['ชื่อ-นามสกุล','name','text'],['อีเมล','email','email'],['เบอร์โทร','phone','text']].map(([label, key, type]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type={type} value={form[key]} onChange={e => f(key, e.target.value)}
                  disabled={editId && key === 'email'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
              </div>
            ))}
            {!editId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                <input type="password" value={form.password} onChange={e => f('password', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">บทบาท</label>
              <select value={form.role} onChange={e => f('role', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="employee">พนักงาน</option>
                <option value="admin">ผู้ดูแลระบบ</option>
              </select>
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
