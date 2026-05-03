import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import TruckList from './pages/trucks/TruckList'
import CompanyList from './pages/companies/CompanyList'
import TripList from './pages/trips/TripList'
import Accounting from './pages/accounting/Accounting'
import Insurance from './pages/insurance/Insurance'
import Maintenance from './pages/maintenance/Maintenance'
import Reports from './pages/reports/Reports'
import UserManagement from './pages/users/UserManagement'
import Layout from './components/layout/Layout'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, userData } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && userData?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="trucks" element={<PrivateRoute adminOnly><TruckList /></PrivateRoute>} />
        <Route path="companies" element={<PrivateRoute adminOnly><CompanyList /></PrivateRoute>} />
        <Route path="trips" element={<TripList />} />
        <Route path="accounting" element={<Accounting />} />
        <Route path="insurance" element={<PrivateRoute adminOnly><Insurance /></PrivateRoute>} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="reports" element={<PrivateRoute adminOnly><Reports /></PrivateRoute>} />
        <Route path="users" element={<PrivateRoute adminOnly><UserManagement /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
