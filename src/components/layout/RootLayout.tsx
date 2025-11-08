import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import SideMenu from './SideMenu'
import './RootLayout.css'

interface RootLayoutProps {
  children: React.ReactNode
}

export const RootLayout = ({ children }: RootLayoutProps) => {
  const location = useLocation()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const isAuthPage = location.pathname.includes('/auth/') || location.pathname === '/login'

  // Note: Auth state changes are now handled by AuthContext
  // Navigation on login/logout is handled by Login component and SideMenu

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