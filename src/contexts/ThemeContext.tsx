import { createContext, useContext, useEffect, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'light',
  setPreference: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'light'
    return (localStorage.getItem('theme-preference') as ThemePreference) ?? 'light'
  })

  useEffect(() => {
    function apply(pref: ThemePreference) {
      const root = document.documentElement
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const isDark = pref === 'dark' || (pref === 'system' && prefersDark)
      if (isDark) root.classList.add('dark')
      else root.classList.remove('dark')
    }

    apply(preference)

    if (preference === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => apply('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [preference])

  function setPreference(p: ThemePreference) {
    setPreferenceState(p)
    localStorage.setItem('theme-preference', p)
  }

  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
