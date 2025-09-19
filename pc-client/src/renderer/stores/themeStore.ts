import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

export interface ThemeState {
  theme: Theme
  actualTheme: 'light' | 'dark' // The actual theme applied (resolved from system preference if theme is 'system')

  // Actions
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  initialize: () => Promise<void>
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

const resolveActualTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      actualTheme: 'light',

      setTheme: (theme: Theme) => {
        const actualTheme = resolveActualTheme(theme)
        set({ theme, actualTheme })

        // Save to electron config
        if (window.electronAPI) {
          window.electronAPI.setConfig('theme', theme)
        }
      },

      toggleTheme: () => {
        const { theme } = get()

        if (theme === 'system') {
          // If currently system, toggle to the opposite of system preference
          const systemTheme = getSystemTheme()
          const newTheme = systemTheme === 'dark' ? 'light' : 'dark'
          get().setTheme(newTheme)
        } else {
          // Toggle between light and dark
          const newTheme = theme === 'dark' ? 'light' : 'dark'
          get().setTheme(newTheme)
        }
      },

      initialize: async () => {
        try {
          // Get theme from electron config if available
          if (window.electronAPI) {
            const savedTheme = await window.electronAPI.getConfig('theme')
            if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
              const actualTheme = resolveActualTheme(savedTheme)
              set({ theme: savedTheme, actualTheme })
              return
            }
          }

          // Otherwise use the persisted theme or system default
          const { theme } = get()
          const actualTheme = resolveActualTheme(theme)
          set({ actualTheme })

          // Listen for system theme changes
          if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const handleSystemThemeChange = (e: MediaQueryListEvent) => {
              const { theme } = get()
              if (theme === 'system') {
                const newActualTheme = e.matches ? 'dark' : 'light'
                set({ actualTheme: newActualTheme })
              }
            }

            mediaQuery.addEventListener('change', handleSystemThemeChange)

            // Clean up listener when store is destroyed
            return () => {
              mediaQuery.removeEventListener('change', handleSystemThemeChange)
            }
          }
        } catch (error) {
          console.error('Failed to initialize theme:', error)
          // Fallback to system theme
          const actualTheme = getSystemTheme()
          set({ theme: 'system', actualTheme })
        }
      }
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({
        theme: state.theme
      })
    }
  )
)