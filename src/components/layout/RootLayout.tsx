import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { AuthChangeEvent } from '@supabase/supabase-js'
import SideMenu from './SideMenu'
import './RootLayout.css'

interface RootLayoutProps {
  children: React.ReactNode
}

export const RootLayout = ({ children }: RootLayoutProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const isAuthPage = location.pathname.includes('/auth/') || location.pathname === '/login'

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === 'SIGNED_IN') {
        // Don't redirect if already on home page
        if (location.pathname !== '/') {
          navigate('/')
        }
      }
      if (event === 'SIGNED_OUT') {
        navigate('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate, location.pathname])

  const handleSidebarCollapse = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed)
  }

  return (
    <div className="root-layout">
      {!isAuthPage && (
        <SideMenu 
          isCollapsed={isSidebarCollapsed} 
          onToggleCollapse={handleSidebarCollapse}
        />
      )}
      <main 
        className={`main-content ${
          !isAuthPage ? 'with-sidebar' : ''
        } ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
      >
        {children}
      </main>
    </div>
  )
}

export default RootLayout