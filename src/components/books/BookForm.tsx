import { useState, useEffect } from 'react'
import './BookForm.css'
import { supabase } from '../../lib/supabase'

interface BookFormProps {
  isOpen: boolean
  onClose: () => void
  book?: Book
  onSave: () => void
}

interface Book {
  id?: string
  title: string
  author: string
  category: string
  isbn: string
  total_copies: number
  available_copies?: number
}

export const BookForm = ({ isOpen, onClose, book, onSave }: BookFormProps) => {
  const [formData, setFormData] = useState<Book>({
    title: '',
    author: '',
    category: '',
    isbn: '',
    total_copies: 1
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (book) {
      setFormData(book)
    } else {
      setFormData({
        title: '',
        author: '',
        category: '',
        isbn: '',
        total_copies: 1
      })
    }
  }, [book])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (book?.id) {
        // Update existing book
        const { error } = await supabase
          .from('books')
          .update({
            title: formData.title,
            author: formData.author,
            category: formData.category,
            isbn: formData.isbn,
            total_copies: formData.total_copies,
            // Only update available_copies if total_copies has increased
            ...(formData.total_copies > book.total_copies ? {
              available_copies: (book.available_copies ?? 0) + (formData.total_copies - book.total_copies)
            } : {})
          })
          .eq('id', book.id)

        if (error) throw error
      } else {
        // Add new book
        const { error } = await supabase
          .from('books')
          .insert([{
            ...formData,
            available_copies: formData.total_copies // Initially, all copies are available
          }])

        if (error) throw error
      }

      onSave()
      onClose()
    } catch (err) {
      console.error('Error saving book:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while saving the book')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="book-form-overlay">
      <div className="book-form-content">
        <h2>{book ? 'Edit Book' : 'Add New Book'}</h2>
        {error && <div className="book-form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="book-form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter book title"
              required
            />
          </div>

          <div className="book-form-group">
            <label htmlFor="author">Author</label>
            <input
              type="text"
              id="author"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="Enter author name"
              required
            />
          </div>

          <div className="book-form-group">
            <label htmlFor="category">Category</label>
            <input
              type="text"
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Enter book category"
              required
            />
          </div>

          <div className="book-form-group">
            <label htmlFor="isbn">ISBN</label>
            <input
              type="text"
              id="isbn"
              value={formData.isbn}
              onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
              placeholder="Enter ISBN"
              required
            />
          </div>

          <div className="book-form-group">
            <label htmlFor="total_copies">Total Copies</label>
            <input
              type="number"
              id="total_copies"
              min={book ? book.total_copies : 1}
              value={formData.total_copies}
              onChange={(e) => setFormData({ ...formData, total_copies: parseInt(e.target.value) })}
              required
            />
            {book && (
              <div className="book-form-info">
                <span>Available Copies: {book.available_copies}</span>
                {formData.total_copies > book.total_copies && (
                  <span className="book-form-helper-text">
                    (+{formData.total_copies - book.total_copies} new copies will be added to available copies)
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="book-form-actions">
            <button type="button" className="book-form-cancel-button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="book-form-save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>

          {loading && (
            <div className="book-form-loading">
              <div className="book-form-spinner"></div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}