import { Bell, Download, Cloud, CloudOff, CloudDrizzle, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUI } from '../../context/UIContext'

export default function TopBar({
  settings,
  syncState,
  isAuthenticated,
  activePanel,
  onTogglePanel,
  unreadNotificationsCount = 0
}: any) {
  const { currentPage, setCurrentPage } = useUI()

  // Capitalize the current page for the title
  const pageTitle = currentPage.charAt(0).toUpperCase() + currentPage.slice(1)

  // Safely grab the profile
  const profile = settings?.userProfile || { name: 'Player One', avatar: '' }

  // Generate initials for the fallback avatar
  const initials = profile.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  // Dynamic Cloud Status Configuration
  const getCloudConfig = () => {
    if (!isAuthenticated)
      return {
        icon: CloudOff,
        color: 'text-gray-500',
        border: 'border-gray-500/30',
        pulse: false,
        label: 'Offline'
      }
    if (syncState === 'syncing')
      return {
        icon: CloudDrizzle,
        color: 'text-blue-400',
        border: 'border-blue-400/50',
        pulse: true,
        label: 'Syncing'
      }
    if (syncState === 'error')
      return {
        icon: AlertTriangle,
        color: 'text-red-500',
        border: 'border-red-500/50',
        pulse: true,
        label: 'Error'
      }
    return {
      icon: Cloud,
      color: 'text-emerald-400',
      border: 'border-emerald-400/30',
      pulse: false,
      label: 'Secured'
    }
  }

  const cloud = getCloudConfig()

  return (
    // The `drag-region` class lets the user drag the window
    <header className="h-16 flex items-center justify-between px-8 shrink-0 drag-region z-10 backdrop-blur-md border-b border-white/5">
      {/* 1. Page Title */}
      <div className="flex items-center gap-4 no-drag">
        <h1 className="text-2xl font-black text-white tracking-wide drop-shadow-md">
          {pageTitle === 'Search' ? 'Discover' : pageTitle}
        </h1>
      </div>

      {/* 2. Right Side Actions (HUD) */}
      <div className="flex items-center gap-4 no-drag">
        {/* Cloud Telemetry Node */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-inner group cursor-default">
          <div className="relative flex h-3 w-3">
            {cloud.pulse && (
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current ${cloud.color}`}
              ></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${cloud.color} bg-current`}
            ></span>
          </div>
          <span className="text-xs font-bold text-white/50 uppercase tracking-wider group-hover:text-white/80 transition-colors">
            {cloud.label}
          </span>
          <cloud.icon size={14} className={`ml-1 ${cloud.color}`} />
        </div>

        {/* Divider */}
        <div className="w-[1px] h-6 bg-white/10 mx-1" />

        <button
          onClick={() => onTogglePanel('downloads')}
          className={`p-2 rounded-xl transition-all border ${activePanel === 'downloads' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border-transparent hover:border-white/10'}`}
        >
          <Download size={18} />
        </button>

        {/* Notifications Button */}
        <button
          onClick={() => onTogglePanel('notifications')}
          className={`relative p-2 rounded-xl transition-all border ${activePanel === 'notifications' ? 'bg-[#ff2288]/20 text-[#ff2288] border-[#ff2288]/30' : 'text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border-transparent hover:border-white/10'}`}
        >
          <Bell size={18} />
          {/* Active Notification Dot - ONLY SHOWS IF COUNT > 0 */}
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff2288] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff2288] border-2 border-[#121212]"></span>
            </span>
          )}
        </button>

        {/* 3. Interactive User Profile Mini */}
        <div
          onClick={() => setCurrentPage('profile')}
          className="flex items-center gap-3 pl-4 border-l border-white/10 ml-2 cursor-pointer group"
        >
          <div className="text-right hidden md:block transition-transform group-hover:-translate-x-1 duration-300">
            <p className="text-sm font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400">
              {profile.name}
            </p>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
              Online
            </p>
          </div>

          <div className="relative">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#171717] border-2 border-white/10 group-hover:border-white/30 transition-all shadow-lg group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center text-white/50 font-black">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
