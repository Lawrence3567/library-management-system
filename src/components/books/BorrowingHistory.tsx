import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import './BorrowingHistory.css'

interface Fine {
  id: string
  amount: number
  status: 'Pending' | 'Paid'
  payment_date: string | null
}

interface BorrowingRecord {
  id: string
  book_id: string
  user_id: string
  borrowed_date: string
  due_date: string
  returned_date: string | null
  status: 'Active' | 'Returned' | 'Overdue'
  book: {
    title: string
    author: string
  }
  fines?: Fine[]
}

interface BorrowRequest {
  id: string
  book_id: string
  user_id: string
  requested_date: string
  approval_date: string | null
  status: 'Pending Approval' | 'Issued' | 'Rejected'
  rejection_reason: string | null
  book: {
    title: string
    author: string
  }
}

type TabType = 'requests' | 'active' | 'overdue' | 'returned'

export const BorrowingHistory = () => {
  const { user, loading: userLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('requests')
  const [records, setRecords] = useState<BorrowingRecord[]>([])
  const [requests, setRequests] = useState<BorrowRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBorrowingRecords = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available')
      return
    }
    try {
      setLoading(true)
      setError(null)
      console.log('Starting fetch for user:', user?.id)
      
      // Fetch borrow requests
      const { data: requestData, error: requestError } = await supabase
        .from('borrow_requests')
        .select(`
          *,
          book:book_id (
            title,
            author
          )
        `)
        .eq('user_id', user?.id)
        .order('status', { ascending: false })
        .order('requested_date', { ascending: true })
        
      if (requestError) throw requestError
      setRequests(requestData || [])

      // Fetch borrowing records
      const { data: borrowingData, error: borrowingError } = await supabase
        .from('borrowing_records')
        .select(`
          *,
          book:book_id (
            title,
            author
          ),
          fines (
            id,
            amount,
            status,
            payment_date
          )
        `)
        .eq('user_id', user?.id)
        .order('status', { ascending: false })
        .order('due_date', { ascending: true })

      if (borrowingError) {
        console.error('Supabase error (borrowing records):', borrowingError)
        throw borrowingError
      }

      console.log('Received records:', borrowingData?.length || 0)
      console.log('Received requests:', requestData?.length || 0)
      setRecords(borrowingData || [])
      setRequests(requestData || [])
    } catch (err) {
      console.error('Error fetching borrowing records:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while fetching borrowing records')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    console.log('Effect running with user:', user?.id)
    if (user?.id) {
      console.log('Fetching records for user:', user.id)
      fetchBorrowingRecords()
    }
  }, [user?.id, fetchBorrowingRecords])

  if (userLoading) {
    return <div className="borrowing-history-container">Loading user data...</div>
  }

  if (!user) {
    return <div className="borrowing-history-container error">Please log in to view your borrowing history.</div>
  }

  if (loading) {
    return <div className="borrowing-history-container">Loading your borrowing history...</div>
  }
  
  if (error) {
    return <div className="borrowing-history-container error">{error}</div>
  }

  const getActiveContent = () => {
    return (
      <table className="records-table">
        <thead>
          <tr>
            <th>Book Title</th>
            <th>Author</th>
            <th>Borrow Date</th>
            <th>Due Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {records.filter(r => r.status === 'Active').length === 0 ? (
            <tr>
              <td colSpan={5} className="no-records">No active borrows</td>
            </tr>
          ) : (
            records.filter(r => r.status === 'Active').map((record) => (
              <tr key={record.id}>
                <td>{record.book.title}</td>
                <td>{record.book.author}</td>
                <td>{new Date(record.borrowed_date).toLocaleDateString()}</td>
                <td>
                  <span className={
                    new Date(record.due_date) < new Date() ? 'overdue' : ''
                  }>
                    {new Date(record.due_date).toLocaleDateString()}
                  </span>
                </td>
                <td>
                  <span className="status-active">Active</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    )
  }


  const getOverdueContent = () => {
    return (
      <table className="records-table">
        <thead>
          <tr>
            <th>Book Title</th>
            <th>Author</th>
            <th>Borrow Date</th>
            <th>Due Date</th>
            <th>Days Overdue</th>
            <th>Fine Status</th>
          </tr>
        </thead>
        <tbody>
          {records.filter(r => r.status === 'Overdue').length === 0 ? (
            <tr>
              <td colSpan={6} className="no-records">No overdue books</td>
            </tr>
          ) : (
            records.filter(r => r.status === 'Overdue').map((record) => {
              const daysOverdue = Math.ceil(
                (new Date().getTime() - new Date(record.due_date).getTime()) / (1000 * 60 * 60 * 24)
              );
              const pendingFine = record.fines?.find(f => f.status === 'Pending');

              return (
                <tr key={record.id}>
                  <td>{record.book.title}</td>
                  <td>{record.book.author}</td>
                  <td>{new Date(record.borrowed_date).toLocaleDateString()}</td>
                  <td>{new Date(record.due_date).toLocaleDateString()}</td>
                  <td className="overdue">
                    {daysOverdue} days
                  </td>
                  <td className="fine-amount">
                    {pendingFine ? (
                      <span className="fine-status pending">Pending (RM {pendingFine.amount.toFixed(2)})</span>
                    ) : (
                      <span className="fine-status">-</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    )
  }

  const getReturnedContent = () => {
    return (
      <table className="records-table">
        <thead>
          <tr>
            <th>Book Title</th>
            <th>Author</th>
            <th>Borrow Date</th>
            <th>Return Date</th>
          </tr>
        </thead>
        <tbody>
          {records.filter(r => r.status === 'Returned').length === 0 ? (
            <tr>
              <td colSpan={4} className="no-records">No return history</td>
            </tr>
          ) : (
            records.filter(r => r.status === 'Returned').map((record) => (
              <tr key={record.id}>
                <td>{record.book.title}</td>
                <td>{record.book.author}</td>
                <td>{new Date(record.borrowed_date).toLocaleDateString()}</td>
                <td>{record.returned_date ? new Date(record.returned_date).toLocaleDateString() : '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    )
  }

  const getRequestsContent = () => {
    return (
      <table className="records-table">
        <thead>
          <tr>
            <th>Book Title</th>
            <th>Author</th>
            <th>Requested Date</th>
            <th>Status</th>
            <th>Comments</th>
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr>
              <td colSpan={5} className="no-records">No borrowing requests</td>
            </tr>
          ) : (
            requests.map((request) => (
              <tr key={request.id} className={request.status.toLowerCase().replace(' ', '-')}>
                <td>{request.book.title}</td>
                <td>{request.book.author}</td>
                <td>{new Date(request.requested_date).toLocaleDateString()}</td>
                <td>
                  <span className={`status-${request.status.toLowerCase().replace(' ', '-')}`}>
                    {request.status}
                  </span>
                </td>
                <td>
                  {request.status === 'Rejected' && 
                    <span className="rejection-reason">
                      {request.rejection_reason || 'No reason provided'}
                    </span>
                  }
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    )
  }

  const getTabContent = () => {
    switch (activeTab) {
      case 'requests':
        return getRequestsContent()
      case 'active':
        return getActiveContent()
      case 'overdue':
        return getOverdueContent()
      case 'returned':
        return getReturnedContent()
      default:
        return null
    }
  }

  return (
    <div className="borrowing-history-container">
      <header className="borrowing-history-header">
        <h1>My Borrowing History</h1>
      </header>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Requests
        </button>
        <button 
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active
        </button>
        <button 
          className={`tab ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          Overdue
        </button>
        <button 
          className={`tab ${activeTab === 'returned' ? 'active' : ''}`}
          onClick={() => setActiveTab('returned')}
        >
          Returned
        </button>
      </div>

      <div className="records-table-container">
        {getTabContent()}
      </div>
    </div>
  )
}