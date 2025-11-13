import { createContext } from 'react'
import type { Session, AuthError } from '@supabase/supabase-js'
import type { Profile } from '../types/auth'

export interface AuthContextType {
  session: Session | null
  user: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
