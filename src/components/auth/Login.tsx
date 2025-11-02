import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { AuthChangeEvent, User } from '@supabase/supabase-js'
import type { LoginFormData, SignupFormData } from '../../types/auth'
import RoleSelectionModal from './RoleSelectionModal'
import libraryImage from '../../assets/library-login-img.jpg'
import './Login.css'

export const Login = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [pendingGoogleUser, setPendingGoogleUser] = useState<User | null>(null)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const navigate = useNavigate()
  
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: '',
    password: ''
  })
  
  const [signupData, setSignupData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    role: 'Student'
  })

  const [isResetPassword, setIsResetPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  useEffect(() => {
    // Check if user is coming from a password reset link
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setIsResetPassword(true)
      setIsLogin(true)
      return
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/')
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Check if user already exists in our users table
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (!existingUser) {
            // Store the user data and show role selection
            setPendingGoogleUser(session.user)
            setShowRoleModal(true)
          } else {
            // User exists, proceed to home
            navigate('/')
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      })
      if (signInError) throw signInError
    } catch (err) {
      console.error('Error logging in:', err)
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Basic validations
    if (signupData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(signupData.email)) {
      setError('Please enter a valid email address')
      return
    }
    
    try {
      setLoading(true)
      setError(null)

      // Register the user with their actual email
      const { error: signUpError, data } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            name: signupData.name,
            phone: signupData.phone,
            role: signupData.role
          }
        }
      })
      
      if (signUpError) {
        // Handle specific error cases
        if (signUpError.message.includes('email_address_invalid')) {
          throw new Error('Please use a valid email address (e.g., your@gmail.com)')
        } else {
          throw signUpError
        }
      }

      // Create user record
      if (data.user) {
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            name: signupData.name,
            email: signupData.email,
            phone: signupData.phone,
            role: signupData.role
          })

        if (userError) throw userError

        // Check if email confirmation is required
        if (data.session) {
          // User is signed in immediately, navigate to home
          navigate('/')
        } else {
          // Email confirmation is required
          setError('Please check your email to confirm your account before signing in')
          setIsLogin(true) // Switch to login form
        }
      }
    } catch (err) {
      console.error('Error signing up:', err)
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: `${window.location.origin}`
        }
      })
      if (signInError) throw signInError
    } catch (err) {
      console.error('Error with Google sign in:', err)
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelection = async (role: 'Student' | 'Librarian') => {
    if (!pendingGoogleUser) return

    try {
      setLoading(true)
      setError(null)

      // Create user record with selected role
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: pendingGoogleUser.id,
          name: pendingGoogleUser.user_metadata.full_name || pendingGoogleUser.email?.split('@')[0],
          email: pendingGoogleUser.email,
          phone: pendingGoogleUser.user_metadata.phone || '',
          role: role
        })

      if (userError) throw userError

      // Clear pending user and close modal
      setPendingGoogleUser(null)
      setShowRoleModal(false)
      navigate('/')
    } catch (err) {
      console.error('Error creating user record:', err)
      setError(err instanceof Error ? err.message : 'Failed to create user record')
    } finally {
      setLoading(false)
    }
  }

  const toggleForm = () => {
    setIsLogin(!isLogin)
    setIsForgotPassword(false)
    setError(null)
    setSuccess(null)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginData.email) {
      setError('Please enter your email address')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const { error } = await supabase.auth.resetPasswordForEmail(loginData.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      setSuccess('Password reset instructions have been sent to your email')
      setLoginData({ ...loginData, password: '' })
    } catch (err) {
      console.error('Error resetting password:', err)
      setError(err instanceof Error ? err.message : 'Failed to send reset instructions')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setSuccess('Password has been reset successfully')
      setIsResetPassword(false)
      setNewPassword('')
      setConfirmNewPassword('')
      
      // Clear the hash from the URL
      window.location.hash = ''
      
      // Navigate to login after a short delay
      setTimeout(() => {
        setIsLogin(true)
      }, 2000)
    } catch (err) {
      console.error('Error resetting password:', err)
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="auth-container">
        <div className="auth-left">
          <img src={libraryImage} alt="Library" className="library-image" />
          <div className="overlay">
            <h1>Welcome to Library Management System</h1>
            <p>Discover and manage your library resources efficiently</p>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-form-container">
            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="auth-description">
              {isLogin ? 'Please sign in to continue' : 'Please fill in your details'}
            </p>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            {isLogin ? (
              isResetPassword ? (
                // Password Reset Form
                <form onSubmit={handlePasswordReset} className="auth-form">
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
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button type="submit" disabled={loading} className="submit-button">
                    {loading ? 'Loading...' : 'Set New Password'}
                  </button>
                </form>
              ) : (
                // Login Form
                <form onSubmit={isForgotPassword ? handleForgotPassword : handleLogin} className="auth-form">
                  <input
                    type="email"
                    placeholder="Email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                  {!isForgotPassword && (
                    <input
                      type="password"
                      placeholder="Password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  )}
                  <button type="submit" disabled={loading} className="submit-button">
                    {loading ? 'Loading...' : (isForgotPassword ? 'Send Reset Instructions' : 'Sign In')}
                  </button>
                  {!isResetPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(!isForgotPassword)
                        setError(null)
                        setSuccess(null)
                      }}
                      className="forgot-password-button"
                    >
                      {isForgotPassword ? 'Back to Sign In' : 'Forgot Password?'}
                    </button>
                  )}
                </form>
              )
            ) : (
              <form onSubmit={handleSignup} className="auth-form">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  required
                />
                <input
                  type="tel" // Use type="tel" for better mobile keyboard support
                  placeholder="Phone Number"
                  value={signupData.phone}
                  onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                  required // Assuming phone is NOT NULL in the DB
                />
                <select
                  value={signupData.role}
                  onChange={(e) => setSignupData({ ...signupData, role: e.target.value as 'Student' | 'Librarian' })}
                  required
                >
                  <option value="Student">Student</option>
                  <option value="Librarian">Librarian</option>
                </select>
                <input
                  type="password"
                  placeholder="Password"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                  required
                />
                <button type="submit" disabled={loading} className="submit-button">
                  {loading ? 'Loading...' : 'Sign Up'}
                </button>
              </form>
            )}
            
            <div className="auth-divider">
              <span>OR</span>
            </div>

            <button 
              onClick={handleGoogleLogin} 
              disabled={loading}
              className="google-button"
            >
              {loading ? 'Loading...' : 'Sign in with Google'}
            </button>
            
            <p className="auth-switch">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button type="button" onClick={toggleForm} className="switch-button">
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {showRoleModal && (
        <RoleSelectionModal
          onSelectRole={handleRoleSelection}
          onClose={() => {
            setPendingGoogleUser(null)
            setShowRoleModal(false)
          }}
        />
      )}
    </>
  )
}

export default Login