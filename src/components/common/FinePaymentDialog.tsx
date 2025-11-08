import './FinePaymentDialog.css'

interface FinePaymentDialogProps {
  isOpen: boolean
  bookTitle?: string
  userName?: string
  amount?: number
  loading?: boolean
  error?: string | null
  showError?: boolean
  onConfirm: () => void
  onClose: () => void
}

export const FinePaymentDialog = ({
  isOpen,
  bookTitle,
  userName,
  amount,
  loading,
  error,
  showError,
  onConfirm,
  onClose
}: FinePaymentDialogProps) => {
  if (!isOpen) return null

  return (
    <div className="fine-payment-overlay">
      <div className="fine-payment-dialog">
        <div className="confirm-dialog-icon info">
          {'💰'}
        </div>
        <h2 className="fine-payment-title">Confirm Fine Payment</h2>
        <p className="fine-payment-message">
          Are you sure you want to record payment for the following fine?
        </p>
        <div className="fine-payment-details">
          <p><strong>Book:</strong> {bookTitle}</p>
          <p><strong>User:</strong> {userName}</p>
          <p><strong>Amount:</strong> RM {amount?.toFixed(2)}</p>
        </div>
        {showError && error && (
          <div className="fine-payment-error">{error}</div>
        )}
        <div className="fine-payment-actions">
          <button 
            className="fine-payment-button cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="fine-payment-button confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}