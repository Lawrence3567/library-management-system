import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { BookForm } from './BookForm'
import { ConfirmDialog } from '../common/ConfirmDialog'
import './ManageBooks.css'

interface Book {
  id: string
  title: string
  author: string
  category: string
  isbn: string
  total_copies: number
  available_copies: number
}

interface DeleteDialogState {
  isOpen: boolean
  bookId: string
  bookTitle: string
}

export const ManageBooks = () => {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | undefined>()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchField, setSearchField] = useState<'title' | 'author' | 'category' | 'isbn'>('title')
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
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

  const handleDeleteClick = (id: string, title: string) => {
    setDeleteDialog({
      isOpen: true,
      bookId: id,
      bookTitle: title
    })
  }

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', deleteDialog.bookId)

      if (error) throw error

      await fetchBooks()
      setDeleteDialog({ isOpen: false, bookId: '', bookTitle: '' })
    } catch (err) {
      console.error('Error deleting book:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while deleting the book')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, bookId: '', bookTitle: '' })
  }

  const handleEdit = (book: Book) => {
    setSelectedBook(book)
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setSelectedBook(undefined)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setSelectedBook(undefined)
  }

  const filteredBooks = books.filter((book) => {
    const searchValue = searchTerm.toLowerCase()
    const field = book[searchField].toLowerCase()
    return field.includes(searchValue)
  })

  if (loading) return <div className="manage-books-container">Loading...</div>
  if (error) return <div className="manage-books-container error">{error}</div>

  return (
    <div className="manage-books-container">
      <header className="manage-books-header">
        <h1>Manage Books</h1>
        <button className="add-book-button" onClick={handleAdd}>
          Add New Book
        </button>
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
              <th>Total Copies</th>
              <th>Available</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBooks.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-books">No books found.</td>
              </tr>
            ) : (
              filteredBooks.map((book) => (
                <tr key={book.id}>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.category}</td>
                  <td>{book.isbn}</td>
                  <td>{book.total_copies}</td>
                  <td>
                    <span className={book.available_copies === 0 ? 'copies-unavailable' : ''}>
                      {book.available_copies}
                    </span>
                  </td>
                  <td className="actions">
                    <button onClick={() => handleEdit(book)} className="edit-button">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteClick(book.id, book.title)} className="delete-button">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BookForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        book={selectedBook}
        onSave={fetchBooks}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Book"
        message={`Are you sure you want to delete "${deleteDialog.bookTitle}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        type="danger"
      />
    </div>
  )
}