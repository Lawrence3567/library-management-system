import { useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/auth'

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<Profile | null>(null)

  const getProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (data) setUser(data)
    } catch (error) {
      console.error('Error getting profile:', error)
    }
  }, [])

  const getSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      setSession(session)
      if (session?.user.id) {
        await getProfile(session.user.id)
      }
    } catch (error) {
      console.error('Error getting session:', error)
    } finally {
      setLoading(false)
    }
  }, [getProfile])

  useEffect(() => {
    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user.id) {
        await getProfile(session.user.id)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [getProfile, getSession])

  return {
    session,
    loading,
    user
  }
}

export default useAuth