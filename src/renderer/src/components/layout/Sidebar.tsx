import { ReactNode } from 'react'
import { Gamepad2, Search, Settings, User, Compass } from 'lucide-react'
import { useUI } from '../../context/UIContext'

export default function Sidebar() {
  const { performanceMode, currentPage, setCurrentPage } = useUI()

  return (
    <nav
      className={`
        w-20 shrink-0 flex flex-col items-center py-6 gap-4 z-20 
        m-4 rounded-4xl border border-modifier/30 shadow-2xl
        transition-all duration-300
        ${
          performanceMode
            ? 'bg-primary' /* Solid fallback for performance */
            : 'bg-primary/70 backdrop-blur-xl' /* Premium Frosted Glass */
        }
      `}
    >
      {/* Brand Icon (GameBuddy) */}
      <div className="relative group cursor-pointer">
        <div className="w-12 h-12 bg-accent rounded-[1.25rem] flex items-center justify-center text-white font-black text-xl shadow-[0_0_15px_rgba(var(--app-accent),0.4)] group-hover:rounded-xl transition-all duration-300">
          GB
        </div>
      </div>

      <div className="w-8 h-0.5 bg-modifier/50 rounded-full my-1" />

      {/* Main Navigation (Now wired to state!) */}
      <SidebarIcon
        icon={<Gamepad2 size={24} />}
        tooltip="My Library"
        active={currentPage === 'library'}
        onClick={() => setCurrentPage('library')}
      />

      {/* (Optional: You had Compass for Discover, but we can stick to your 4 requested pages for now) */}

      <SidebarIcon
        icon={<Search size={24} />}
        tooltip="Game Search"
        active={currentPage === 'search'}
        onClick={() => setCurrentPage('search')}
      />

      {/* Pushes bottom items to the bottom of the pill */}
      <div className="flex-1" />

      <SidebarIcon
        icon={<User size={24} />}
        tooltip="User Profile"
        active={currentPage === 'profile'}
        onClick={() => setCurrentPage('profile')}
      />
      <SidebarIcon
        icon={<Settings size={24} />}
        tooltip="Settings"
        active={currentPage === 'settings'}
        onClick={() => setCurrentPage('settings')}
      />
    </nav>
  )
}

// Reusable micro-component for highly interactive icons
interface SidebarIconProps {
  icon: ReactNode
  tooltip: string
  active?: boolean
  onClick?: () => void
}

function SidebarIcon({ icon, tooltip, active = false, onClick }: SidebarIconProps) {
  return (
    <div
      className="relative group cursor-pointer flex items-center justify-center w-full"
      onClick={onClick}
    >
      {/* Active Indicator Bar (Left Side) */}
      <div
        className={`absolute left-0 w-1.5 bg-accent rounded-r-full transition-all duration-300 ease-out
        ${active ? 'h-8 opacity-100' : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-50'}`}
      />

      {/* Icon Container */}
      <div
        className={`w-12 h-12 flex items-center justify-center transition-all duration-300 ease-out
        ${
          active
            ? 'bg-accent text-white rounded-2xl shadow-[0_0_15px_rgba(var(--app-accent),0.4)]'
            : 'bg-transparent text-textMuted rounded-[1.5rem] hover:rounded-[1rem] hover:bg-modifier/50 hover:text-textMain'
        }`}
      >
        {icon}
      </div>

      {/* Animated Custom Tooltip (Slides out to the right) */}
      <div className="absolute left-full ml-4 px-3 py-1.5 bg-modifier text-textMain text-sm font-semibold rounded-md opacity-0 -translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50 shadow-lg border border-white/5 whitespace-nowrap">
        {tooltip}
      </div>
    </div>
  )
}
