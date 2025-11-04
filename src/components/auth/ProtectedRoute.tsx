import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: string[]
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const userRole = session.user.user_metadata.role || 'Student'

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute