import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ConfirmDialog } from '../common/ConfirmDialog'
import './BrowseBooks.css'

interface Book {
  id: string
  title: string
  author: string
  category: string
  isbn: string
  total_copies: number
  available_copies: number
}

export const BrowseBooks = () => {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchField, setSearchField] = useState<'title' | 'author' | 'category' | 'isbn'>('title')
  const [borrowDialog, setBorrowDialog] = useState<{
    isOpen: boolean
    bookId: string
    bookTitle: string
  }>({
    isOpen: false,
    bookId: '',
    bookTitle: ''
  })

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

  const handleBorrowClick = (bookId: string, bookTitle: string) => {
    setBorrowDialog({
      isOpen: true,
      bookId,
      bookTitle
    })
  }

  const handleBorrowConfirm = async () => {
    if (!user || !user.id) {
      setError('User session not found. Please log in again.')
      setBorrowDialog({ isOpen: false, bookId: '', bookTitle: '' })
      return
    }

    try {
      setLoading(true)
      setError(null)

      // First check if user already has a pending request for this book
      const { data: existingRequests, error: checkError } = await supabase
        .from('borrow_requests')
        .select('*')
        .eq('book_id', borrowDialog.bookId)
        .eq('user_id', user.id)
        .eq('status', 'Pending Approval')

      if (checkError) throw checkError

      if (existingRequests && existingRequests.length > 0) {
        setError('You already have a pending request for this book')
        setBorrowDialog({ isOpen: false, bookId: '', bookTitle: '' })
        return
      }

      const { error: borrowError } = await supabase
        .from('borrow_requests')
        .insert([
          {
            book_id: borrowDialog.bookId,
            user_id: user.id,
            status: 'Pending Approval'
          }
        ])

      if (borrowError) throw borrowError

      // Update available copies
      const { error: updateError } = await supabase
        .rpc('decrement_available_copies', {
          book_id: borrowDialog.bookId
        })

      if (updateError) throw updateError

      await fetchBooks()
      setBorrowDialog({ isOpen: false, bookId: '', bookTitle: '' })
    } catch (err) {
      console.error('Error requesting book:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while requesting the book')
    } finally {
      setLoading(false)
    }
  }

  const handleBorrowCancel = () => {
    setBorrowDialog({ isOpen: false, bookId: '', bookTitle: '' })
  }

  const filteredBooks = books.filter((book) => {
    const searchValue = searchTerm.toLowerCase()
    const field = book[searchField].toLowerCase()
    return field.includes(searchValue)
  })

  if (loading) return <div className="browse-books-container">Loading...</div>
  if (error) return <div className="browse-books-container error">{error}</div>

  return (
    <div className="browse-books-container">
      <header className="browse-books-header">
        <div className="browse-books-header-content">
          <h1>Browse Books</h1>
          <Link to="/borrowing-history" className="borrowing-history-link">View Borrowing History</Link>
        </div>
      </header>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search books..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as 'title' | 'author' | 'category' | 'isbn')}
          className="search-field-select"
        >
          <option value="title">Title</option>
          <option value="author">Author</option>
          <option value="category">Category</option>
          <option value="isbn">ISBN</option>
        </select>
      </div>

      <div className="books-table-container">
        <table className="books-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Category</th>
              <th>ISBN</th>
              <th>Available</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBooks.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-books">No books found.</td>
              </tr>
            ) : (
              filteredBooks.map((book) => (
                <tr key={book.id}>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.category}</td>
                  <td>{book.isbn}</td>
                  <td>
                    <span className={book.available_copies === 0 ? 'copies-unavailable' : ''}>
                      {book.available_copies}
                    </span>
                  </td>
                  <td className="actions">
                    {book.available_copies > 0 ? (
                      <button
                        onClick={() => handleBorrowClick(book.id, book.title)}
                        className="borrow-button"
                      >
                        Request Borrow
                      </button>
                    ) : (
                      <span className="unavailable-text">Not Available</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={borrowDialog.isOpen}
        title="Request Book"
        message={`Are you sure you want to request "${borrowDialog.bookTitle}"?`}
        confirmButtonText="Request"
        cancelButtonText="Cancel"
        onConfirm={handleBorrowConfirm}
        onCancel={handleBorrowCancel}
        type="info"
      />
    </div>
  )
}