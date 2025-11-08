import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/auth'

interface AuthContextType {
  session: Session | null
  user: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

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
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 1000) // 1 second timeout
      })

      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any

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
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session fetch timeout')), 1000) // 1 second timeout
      })

      const sessionPromise = supabase.auth.getSession()

      const { data: { session: currentSession }, error } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as any
      
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
    // Load session on mount
    loadSession()

    // Set up auth state change listener
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

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [loadSession, getProfile])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error }
      }

      // Session will be updated via the onAuthStateChange listener
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })

      if (error) {
        return { error }
      }

      return { error: null }
    } catch (error) {
      return { error }
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
