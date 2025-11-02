import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './Home.css' // Assuming you'll add the necessary CSS here

interface Book {
  id: string
  title: string
  author: string
  isbn: string
  quantity: number
}

export const Home = () => {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // New state to manage the visibility of the profile dropdown
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false) 
  const navigate = useNavigate()

  useEffect(() => {
    fetchBooks()
    // Optional: Add a listener to close the menu when clicking outside
    // const closeMenu = (event: MouseEvent) => {
    //   // Logic to check if click is outside the profile button/menu
    //   // For simplicity, we'll keep it simple here, but a proper
    //   // implementation would involve refs.
    //   // For now, let's keep it simple with just the button toggle.
    // }
    // document.addEventListener('mousedown', closeMenu)
    // return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('title')

      if (error) throw error

      setBooks(data || [])
    } catch (err) {
      console.error('Error fetching books:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while fetching books')
    } finally {
      setLoading(false)
    }
  }

  // New function to handle the Update Profile action
  const handleUpdateProfile = () => {
    // 1. Close the menu
    setIsProfileMenuOpen(false) 
    // 2. Navigate to the Update Profile page (you'll need to create this route and component)
    navigate('/profile') 
  }
  
  const handleLogout = async () => {
    try {
      // 1. Close the menu
      setIsProfileMenuOpen(false) 
      // 2. Perform Supabase logout
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      // 3. Redirect to login page
      navigate('/login')
    } catch (err) {
      console.error('Error logging out:', err)
    }
  }

  // Function to toggle the profile menu visibility
  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen)
  }

  if (loading) return <div className="home-container">Loading...</div>
  if (error) return <div className="home-container error">{error}</div>

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Library Management System</h1>
        
        {/* NEW PROFILE DROPDOWN STRUCTURE */}
        <div className="profile-dropdown">
          <button 
            onClick={toggleProfileMenu} 
            className="profile-button"
            aria-expanded={isProfileMenuOpen} // Accessibility
            aria-controls="profile-menu"     // Accessibility
          >
            Profile
          </button>
          
          {/* Conditional rendering for the menu */}
          {isProfileMenuOpen && (
            <div id="profile-menu" className="profile-dropdown-content">
              {/* Menu Item 1: Update Profile */}
              <button onClick={handleUpdateProfile} className="menu-item">
                Update Profile
              </button>
              {/* Menu Item 2: Logout */}
              <button onClick={handleLogout} className="menu-item">
                Logout
              </button>
            </div>
          )}
        </div>
        {/* END NEW PROFILE DROPDOWN STRUCTURE */}

      </header>

      <main className="books-container">
        <h2>Available Books</h2>
        {books.length === 0 ? (
          <p>No books available.</p>
        ) : (
          <div className="books-grid">
            {books.map((book) => (
              <div key={book.id} className="book-card">
                <h3>{book.title}</h3>
                <p>Author: {book.author}</p>
                <p>ISBN: {book.isbn}</p>
                <p>Available: {book.quantity}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Home