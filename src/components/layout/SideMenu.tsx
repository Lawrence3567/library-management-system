import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import './SideMenu.css'

interface SideMenuProps {
  isCollapsed: boolean
  onToggleCollapse: (collapsed: boolean) => void
}

const SideMenu = ({ isCollapsed, onToggleCollapse }: SideMenuProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { session } = useAuth()
  
  // Get user role from session metadata
  const userRole = session?.user?.user_metadata?.role || 'Student'

  const menuItems = [
    {
      path: '/',
      label: 'Home',
      icon: '🏠'
    },
    ...(userRole === 'Librarian' ? [
      {
        path: '/manage-books',
        label: 'Manage Books',
        icon: '📚'
      },
      {
        path: '/manage-requests',
        label: 'Manage Requests',
        icon: '📋'
      },
      {
        path: '/fine-rules',
        label: 'Fine Rules',
        icon: '💰'
      },
      {
        path: '/report',
        label: 'Reports',
        icon: '📊'
      }
    ] : [
      {
        path: '/browse-books',
        label: 'Browse Books',
        icon: '📚'
      },
      {
        path: '/borrowing-history',
        label: 'My Borrows',
        icon: '📖'
      }
    ]),
  ];

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      navigate('/login')
    } catch (err) {
      console.error('Error logging out:', err)
    }
  }

  return (
    <div className={`side-menu ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="toggle-button"
        onClick={() => onToggleCollapse(!isCollapsed)}
      >
        {isCollapsed ? '→' : '←'}
      </button>
      
      <div className="menu-content">
        <div className="menu-items">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{!isCollapsed && item.label}</span>
            </Link>
          ))}
        </div>

        <div className="menu-footer">
          <Link
            to="/profile"
            className={`menu-item ${location.pathname === '/profile' ? 'active' : ''}`}
          >
            <span className="menu-icon">👤</span>
            <span className="menu-label">{!isCollapsed && 'Profile'}</span>
          </Link>
          <button 
            onClick={handleLogout}
            className="menu-item logout-button"
          >
            <span className="menu-icon">🚪</span>
            <span className="menu-label">{!isCollapsed && 'Logout'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SideMenu;