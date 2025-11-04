import './ConfirmDialog.css'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmButtonText?: string
  cancelButtonText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'danger' | 'warning' | 'info'
}

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger'
}: ConfirmDialogProps) => {
  if (!isOpen) return null

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className={`confirm-dialog-icon ${type}`}>
          {type === 'danger' && '⚠️'}
          {type === 'warning' && '⚡'}
          {type === 'info' && 'ℹ️'}
        </div>
        <h2 className="confirm-dialog-title">{title}</h2>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button 
            className="confirm-dialog-button cancel"
            onClick={onCancel}
          >
            {cancelButtonText}
          </button>
          <button 
            className={`confirm-dialog-button confirm ${type}`}
            onClick={onConfirm}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  )
}