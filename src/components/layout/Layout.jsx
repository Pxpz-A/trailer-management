import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../firebase/auth'
import {
  LayoutDashboard, Truck, Building2, Navigation, BookOpen,
  Shield, Wrench, BarChart3, Users, LogOut, Menu, X, Bell
} from 'lucide-react'

const adminMenus = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trucks', icon: Truck, label: 'จัดการรถ' },
  { to: '/companies', icon: Building2, label: 'บริษัทซัพ' },
  { to: '/trips', icon: Navigation, label: 'เที่ยววิ่ง' },
  { to: '/accounting', icon: BookOpen, label: 'บัญชีรายรับ-จ่าย' },
  { to: '/insurance', icon: Shield, label: 'ประกัน/ภาษี' },
  { to: '/maintenance', icon: Wrench, label: 'ซ่อมบำรุง' },
  { to: '/reports', icon: BarChart3, label: 'รายงาน' },
  { to: '/users', icon: Users, label: 'จัดการผู้ใช้' },
]

const driverMenus = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trips', icon: Navigation, label: 'เที่ยววิ่ง' },
  { to: '/accounting', icon: BookOpen, label: 'บัญชีรายรับ-จ่าย' },
  { to: '/maintenance', icon: Wrench, label: 'ซ่อมบำรุง' },
]

export default function Layout() {
  const { userData } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menus = userData?.role === 'admin' ? adminMenus : driverMenus

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-blue-700">
        <div className="flex items-center gap-3">
          <div className="bg-white text-blue-600 p-2 rounded-lg">
            <Truck size={22} />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">RCM</p>
            <p className="text-blue-200 text-xs">Transport</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menus.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} 
            to={to}
            end={to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-white text-blue-600 font-semibold'
                  : 'text-blue-100 hover:bg-blue-700'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-blue-700">
        <div className="px-4 py-2 mb-2">
          <p className="text-white text-sm font-medium truncate">{userData?.name}</p>
          <p className="text-blue-300 text-xs">{userData?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'คนขับ'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-blue-100 hover:bg-blue-700 rounded-lg text-sm transition-colors"
        >
          <LogOut size={18} />
          ออกจากระบบ
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-blue-600 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-60 bg-blue-600 flex flex-col">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
          <button
            className="md:hidden text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <button className="text-gray-500 hover:text-gray-700 relative">
              <Bell size={20} />
            </button>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {userData?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
