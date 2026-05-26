import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Define our valid page routes
export type PageRoute = 'library' | 'search' | 'profile' | 'settings' | 'game' | 'category'

interface UIContextType {
  theme: string
  setTheme: (theme: string) => void
  performanceMode: boolean
  setPerformanceMode: (active: boolean) => void
  wallpaper: string | null
  setWallpaper: (path: string | null) => void
  // NEW: Routing State
  currentPage: PageRoute
  setCurrentPage: (page: PageRoute) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('theme-default')
  const [performanceMode, setPerformanceMode] = useState(false)
  const [wallpaper, setWallpaper] = useState<string | null>(null)
  // NEW: Default to Library
  const [currentPage, setCurrentPage] = useState<PageRoute>('library')

  useEffect(() => {
    document.body.className = theme
  }, [theme])

  return (
    <UIContext.Provider
      value={{
        theme,
        setTheme,
        performanceMode,
        setPerformanceMode,
        wallpaper,
        setWallpaper,
        currentPage,
        setCurrentPage // Export the router
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const context = useContext(UIContext)
  if (!context) throw new Error('useUI must be used within a UIProvider')
  return context
}
