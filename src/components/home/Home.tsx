import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './Home.css'

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
  const navigate = useNavigate()

  useEffect(() => {
    fetchBooks()
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

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      navigate('/login')
    } catch (err) {
      console.error('Error logging out:', err)
    }
  }

  if (loading) return <div className="home-container">Loading...</div>
  if (error) return <div className="home-container error">{error}</div>

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Library Management System</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
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