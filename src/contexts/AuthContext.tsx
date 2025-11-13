import { useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/auth'
import { AuthContext, type AuthContextType } from './auth.context'

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const getProfile = useCallback(async (userId: string) => {
    try {
      // Add timeout to prevent hanging queries
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 1000) // 1 second timeout
      })

      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await Promise.race<any>([
        queryPromise,
        timeoutPromise
      ])

      const { data, error } = result

      if (error) {
        console.error('Error getting profile:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error getting profile:', error)
      return null
    }
  }, [])

  const loadSession = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get the current session from Supabase with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Session fetch timeout')), 1000) // 1 second timeout
      })

      const sessionPromise = supabase.auth.getSession()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await Promise.race<any>([
        sessionPromise,
        timeoutPromise
      ])

      const { data: { session: currentSession }, error } = result
      
      if (error) {
        console.error('Error getting session:', error)
        setSession(null)
        setUser(null)
        return
      }

      setSession(currentSession)

      // If we have a session, fetch the user profile
      if (currentSession?.user?.id) {
        const profile = await getProfile(currentSession.user.id)
        setUser(profile)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error loading session:', error)
      setSession(null)
      setUser(null)
    } finally {
      // Always set loading to false to prevent infinite loading state
      setLoading(false)
    }
  }, [getProfile])

  useEffect(() => {
    // Initialize auth with sequential steps to avoid race conditions
    const initializeAndListen = async () => {
      // Step 1: Load session first (ensure initial state is set)
      await loadSession()

      // Step 2: Only after initial load, set up the auth state listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        console.log('Auth state changed:', event)
        
        try {
          setSession(currentSession)

          if (currentSession?.user?.id) {
            // Fetch user profile when session is available
            const profile = await getProfile(currentSession.user.id)
            setUser(profile)
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error('Error in auth state change handler:', error)
          // Set user to null on error to prevent stale data
          setUser(null)
        } finally {
          // Always set loading to false, even if profile fetch fails
          setLoading(false)
        }
      })

      // Step 3: Handle tab visibility change to reload session/profile
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('Tab became visible, reloading profile...')
          // Reload the session and profile when returning to the tab
          loadSession()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      // Return cleanup function
      return () => {
        subscription.unsubscribe()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }

    // Execute initialization and get cleanup function
    let unsubscribe: (() => void) | undefined

    initializeAndListen().then((cleanup) => {
      unsubscribe = cleanup
    })

    // Cleanup subscription on unmount
    return () => {
      unsubscribe?.()
    }
  }, [loadSession, getProfile])

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return { error: error || null }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })

      return { error: error || null }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!session?.user?.id) {
      throw new Error('No authenticated user')
    }

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', session.user.id)

      if (error) throw error

      // Update local user state
      setUser(prev => prev ? { ...prev, ...updates } : null)
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  const refreshSession = async () => {
    await loadSession()
  }

  const value: AuthContextType = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
export type { AuthContextType }
