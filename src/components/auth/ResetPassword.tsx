import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import libraryImage from '../../assets/library-login-img.jpg'

const ResetPassword = () => {
  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if we have an access token indicating a valid reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/auth/login')
      }
    }
    checkSession()
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setSuccess(true)
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate('/auth/login')
      }, 2000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error updating password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <img src={libraryImage} alt="Library" className="library-image" />
        <div className="overlay">
          <h1>Reset Your Password</h1>
          <p>Choose a new secure password for your account</p>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-container">
          <h2>Set New Password</h2>
          <p className="auth-description">Please enter your new password</p>

          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message">
              Password updated successfully! Redirecting to login...
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword