"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { createClient } from "./supabase"
import type { Session } from "@supabase/supabase-js"

interface AuthUser {
  id: string
  email: string
  restaurant_id: number
  restaurant_name: string
  role: "admin" | "staff"
}

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  error: string | null
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchUserInfo = useCallback(async (accessToken: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (res.status === 403) {
        setError("Access denied. Contact administrator.")
        setUser(null)
        return
      }

      if (!res.ok) {
        throw new Error("Failed to fetch user info")
      }

      const data = await res.json()
      setUser(data)
      setError(null)
    } catch {
      setError("Failed to authenticate. Please try again.")
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)

      if (session?.access_token) {
        await fetchUserInfo(session.access_token)
      }

      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)

        if (session?.access_token) {
          await fetchUserInfo(session.access_token)
        } else {
          setUser(null)
          setError(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, fetchUserInfo])

  const signInWithMagicLink = async (email: string) => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  const signInWithPassword = async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  const signUp = async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        signInWithMagicLink,
        signInWithPassword,
        signUp,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
