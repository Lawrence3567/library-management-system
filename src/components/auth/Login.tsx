import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { AuthChangeEvent } from '@supabase/supabase-js'
import libraryImage from '../../assets/library-login-img.jpg'
import './Login.css'

export const Login = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/')
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session) => {
        if (event === 'SIGNED_IN' && session) {
          navigate('/')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])

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
      console.error('Error logging in:', err)
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <img src={libraryImage} alt="Library" className="library-image" />
        <div className="overlay">
          <h1>Welcome to Library Management System</h1>
          <h2>Discover and manage your library resources efficiently</h2>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-container">
          <h2>Welcome Back</h2>
          <p className="auth-description">Please sign in to continue</p>
          {error && <div className="error-message">{error}</div>}
          <button 
            onClick={handleGoogleLogin} 
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Loading...' : 'Sign in with Google'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login