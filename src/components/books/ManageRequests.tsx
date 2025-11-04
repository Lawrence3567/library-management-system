import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ConfirmDialog } from '../common/ConfirmDialog'
import './ManageRequests.css'

interface BorrowRequest {
  id: string
  book_id: string
  user_id: string
  status: 'Pending Approval' | 'Issued' | 'Rejected'
  requested_date: string
  approval_date: string | null
  rejection_reason: string | null
  book: {
    title: string
    author: string
  }
  user: {
    name: string
    email: string
  }
}

interface ActionDialogState {
  isOpen: boolean
  type: 'approve' | 'reject' | 'return'
  requestId: string
  bookTitle: string
  userName: string
  loanId?: string
}

type TabType = 'active' | 'pending' | 'issued' | 'rejected'

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
  user: {
    name: string
    email: string
  }
}

export const ManageRequests = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [requests, setRequests] = useState<BorrowRequest[]>([])
  const [activeLoans, setActiveLoans] = useState<BorrowingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionDialog, setActionDialog] = useState<ActionDialogState>({
    isOpen: false,
    type: 'approve',
    requestId: '',
    bookTitle: '',
    userName: ''
  })
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch borrow requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('borrow_requests')
        .select(`
          *,
          book:book_id (
            title,
            author
          ),
          user:user_id (
            name,
            email
          )
        `)
        .order('requested_date', { ascending: false })

      if (requestsError) throw requestsError
      setRequests(requestsData || [])

      // Fetch active loans
      const { data: loansData, error: loansError } = await supabase
        .from('borrowing_records')
        .select(`
          *,
          book:book_id (
            title,
            author
          ),
          user:user_id (
            name,
            email
          )
        `)
        .eq('status', 'Active')
        .order('due_date', { ascending: true })

      if (loansError) throw loansError
      setActiveLoans(loansData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveClick = (request: BorrowRequest) => {
    setActionDialog({
      isOpen: true,
      type: 'approve',
      requestId: request.id,
      bookTitle: request.book.title,
      userName: request.user.name
    })
  }

  const handleRejectClick = (request: BorrowRequest) => {
    setActionDialog({
      isOpen: true,
      type: 'reject',
      requestId: request.id,
      bookTitle: request.book.title,
      userName: request.user.name
    })
  }

  const handleConfirmAction = async () => {
    try {
      setLoading(true)
      if (actionDialog.type === 'approve') {
        // Create borrowing record
        const { error: recordError } = await supabase
          .from('borrowing_records')
          .insert([
            {
              book_id: requests.find(r => r.id === actionDialog.requestId)?.book_id,
              user_id: requests.find(r => r.id === actionDialog.requestId)?.user_id,
              due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
            }
          ])

        if (recordError) throw recordError

        // Update request status
        const { error: updateError } = await supabase
          .from('borrow_requests')
          .update({
            status: 'Issued',
            approval_date: new Date().toISOString()
          })
          .eq('id', actionDialog.requestId)

        if (updateError) throw updateError
      } else {
        // Reject request
        if (!rejectionReason.trim()) {
          setError('Please provide a rejection reason')
          return
        }

        const { error: rejectError } = await supabase
          .from('borrow_requests')
          .update({
            status: 'Rejected',
            rejection_reason: rejectionReason,
            approval_date: new Date().toISOString()
          })
          .eq('id', actionDialog.requestId)

        if (rejectError) throw rejectError

        // Increment available copies back
        const request = requests.find(r => r.id === actionDialog.requestId)
        if (request) {
          const { error: updateError } = await supabase
            .rpc('increment_available_copies', {
              book_id: request.book_id
            })

          if (updateError) throw updateError
        }
      }

      await fetchData()
      setActionDialog({ isOpen: false, type: 'approve', requestId: '', bookTitle: '', userName: '' })
      setRejectionReason('')
    } catch (err) {
      console.error('Error processing request:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while processing the request')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAction = () => {
    setActionDialog({ isOpen: false, type: 'approve', requestId: '', bookTitle: '', userName: '' })
    setRejectionReason('')
  }



  const groupedRequests = {
    pending: requests.filter(r => r.status === 'Pending Approval'),
    issued: requests.filter(r => r.status === 'Issued'),
    rejected: requests.filter(r => r.status === 'Rejected')
  }

  if (loading) return <div className="manage-requests-container">Loading...</div>
  if (error) return <div className="manage-requests-container error">{error}</div>

  return (
    <div className="manage-requests-container">
      <header className="manage-requests-header">
        <h1>Manage Borrow Requests</h1>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Loans
        </button>
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Approval
        </button>
        <button
          className={`tab ${activeTab === 'issued' ? 'active' : ''}`}
          onClick={() => setActiveTab('issued')}
        >
          Issued
        </button>
        <button
          className={`tab ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          Rejected
        </button>
      </div>

      {activeTab === 'active' && (
        <section className="requests-section active">
          <div className="requests-table-container">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Student Name</th>
                  <th>Borrowed Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeLoans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="no-requests">No active loans</td>
                  </tr>
                ) : (
                  activeLoans.map((loan) => {
                    const dueDate = new Date(loan.due_date)
                    const isOverdue = dueDate < new Date()
                    return (
                      <tr key={loan.id} className={isOverdue ? 'overdue' : ''}>
                        <td>{loan.book.title}</td>
                        <td>{loan.user.name}</td>
                        <td>{new Date(loan.borrowed_date).toLocaleDateString()}</td>
                        <td className={isOverdue ? 'overdue' : ''}>{dueDate.toLocaleDateString()}</td>
                        <td className={isOverdue ? 'overdue' : ''}>{isOverdue ? 'Overdue' : 'Active'}</td>
                        <td className="actions">
                          <button
                            onClick={() => setActionDialog({
                              isOpen: true,
                              type: 'return',
                              requestId: '',
                              bookTitle: loan.book.title,
                              userName: loan.user.name,
                              loanId: loan.id
                            })}
                            className="return-button"
                          >
                            Mark as Returned
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'pending' && (
        <section className="requests-section pending">
          <div className="requests-table-container">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Student Name</th>
                  <th>Requested Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedRequests.pending.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="no-requests">No pending requests</td>
                  </tr>
                ) : (
                  groupedRequests.pending.map((request) => (
                    <tr key={request.id}>
                      <td>{request.book.title}</td>
                      <td>{request.user.name}</td>
                      <td>{new Date(request.requested_date).toLocaleDateString()}</td>
                      <td className="actions">
                        <button
                          onClick={() => handleApproveClick(request)}
                          className="approve-button"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectClick(request)}
                          className="reject-button"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'issued' && (
        <section className="requests-section issued">
          <div className="requests-table-container">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Student Name</th>
                  <th>Requested Date</th>
                  <th>Issued Date</th>
                </tr>
              </thead>
              <tbody>
                {groupedRequests.issued.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="no-requests">No issued requests</td>
                  </tr>
                ) : (
                  groupedRequests.issued.map((request) => (
                    <tr key={request.id}>
                      <td>{request.book.title}</td>
                      <td>{request.user.name}</td>
                      <td>{new Date(request.requested_date).toLocaleDateString()}</td>
                      <td>{request.approval_date ? new Date(request.approval_date).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'rejected' && (
        <section className="requests-section rejected">
          <div className="requests-table-container">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Student Name</th>
                  <th>Requested Date</th>
                  <th>Rejected Date</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {groupedRequests.rejected.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="no-requests">No rejected requests</td>
                  </tr>
                ) : (
                  groupedRequests.rejected.map((request) => (
                    <tr key={request.id}>
                      <td>{request.book.title}</td>
                      <td>{request.user.name}</td>
                      <td>{new Date(request.requested_date).toLocaleDateString()}</td>
                      <td>{request.approval_date ? new Date(request.approval_date).toLocaleDateString() : '-'}</td>
                      <td>{request.rejection_reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Return Dialog */}
      <ConfirmDialog
        isOpen={actionDialog.isOpen && actionDialog.type === 'return'}
        title="Mark Book as Returned"
        message={`Are you sure you want to mark "${actionDialog.bookTitle}" borrowed by ${actionDialog.userName} as returned?`}
        confirmButtonText="Confirm"
        cancelButtonText="Cancel"
        onConfirm={async () => {
          try {
            setLoading(true)
            
            // Get the loan record
            const loan = activeLoans.find(l => l.id === actionDialog.loanId)
            if (!loan) throw new Error('Loan record not found')
            
            // Update borrowing record status to Returned
            const { error: updateError } = await supabase
              .from('borrowing_records')
              .update({
                status: 'Returned',
                returned_date: new Date().toISOString()
              })
              .eq('id', actionDialog.loanId)

            if (updateError) throw updateError

            // Increment available copies
            const { error: incrementError } = await supabase
              .rpc('increment_available_copies', {
                book_id: loan.book_id
              })

            if (incrementError) throw incrementError

            await fetchData()
            handleCancelAction()
          } catch (err) {
            console.error('Error marking book as returned:', err)
            setError(err instanceof Error ? err.message : 'An error occurred while marking the book as returned')
          } finally {
            setLoading(false)
          }
        }}
        onCancel={handleCancelAction}
        type="info"
      />

      {/* Approval Dialog */}
      <ConfirmDialog
        isOpen={actionDialog.isOpen && actionDialog.type === 'approve'}
        title="Approve Borrow Request"
        message={`Are you sure you want to approve the borrow request for "${actionDialog.bookTitle}" by ${actionDialog.userName}?`}
        confirmButtonText="Approve"
        cancelButtonText="Cancel"
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
        type="info"
      />

      {/* Rejection Dialog */}
      <div className={`modal-overlay ${actionDialog.isOpen && actionDialog.type === 'reject' ? 'active' : ''}`}>
        {actionDialog.isOpen && actionDialog.type === 'reject' && (
          <div className="modal-content">
            <h2>Reject Borrow Request</h2>
            <p>
              Are you sure you want to reject the borrow request for "{actionDialog.bookTitle}" by {actionDialog.userName}?
            </p>
            <div className="form-group">
              <label htmlFor="rejectionReason">Rejection Reason (Required)</label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection"
                required
              />
            </div>
            <div className="form-actions">
              <button className="cancel-button" onClick={handleCancelAction}>
                Cancel
              </button>
              <button
                className="reject-button"
                onClick={handleConfirmAction}
                disabled={!rejectionReason.trim()}
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}