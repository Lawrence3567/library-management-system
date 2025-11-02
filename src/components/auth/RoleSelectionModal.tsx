import type { FC } from 'react'
import './RoleSelectionModal.css'

interface RoleSelectionModalProps {
  onSelectRole: (role: 'Student' | 'Librarian') => void;
  onClose: () => void;
}

const RoleSelectionModal: FC<RoleSelectionModalProps> = ({ onSelectRole, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>&times;</button>
        <h2>Select Your Role</h2>
        <p>Please select your role in the library system</p>
        <div className="role-buttons">
          <button 
            onClick={() => onSelectRole('Student')}
            className="role-button student-role"
          >
            <span className="role-title">Student</span>
            <span className="role-description">Access and borrow books from the library</span>
          </button>
          <button 
            onClick={() => onSelectRole('Librarian')}
            className="role-button librarian-role"
          >
            <span className="role-title">Librarian</span>
            <span className="role-description">Manage books and user borrowings</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoleSelectionModal