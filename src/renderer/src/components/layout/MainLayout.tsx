import { ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Server,
  Activity,
  Download,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { NetworkTask, SystemNotification } from 'src/shared/types'

interface MainLayoutProps {
  children: ReactNode
  settings?: any
  syncState?: any
  isAuthenticated?: boolean
  networkTasks?: NetworkTask[]
  notifications?: SystemNotification[]
  onMarkNotificationsRead?: () => void
}

export default function MainLayout({
  children,
  settings,
  syncState,
  isAuthenticated,
  networkTasks = [],
  notifications = [],
  onMarkNotificationsRead
}: MainLayoutProps) {
  // Tracks which side panel is open
  const [activePanel, setActivePanel] = useState<'downloads' | 'notifications' | null>(null)

  const handleTogglePanel = (panel: 'downloads' | 'notifications') => {
    if (panel === 'notifications' && activePanel !== 'notifications') {
      onMarkNotificationsRead?.()
    }
    setActivePanel((prev) => (prev === panel ? null : panel))
  }

  return (
    // Added 'relative z-0' here to establish the master stacking context
    <div className="flex h-screen w-full text-textMain overflow-hidden selection:bg-accent/30 bg-primary relative z-0">
      {/* --- THE AAA GLOBAL AMBIENT BLEED --- */}
      {/* This sits permanently in the background. It reads the CSS variable broadcasted by the Carousel */}
      <div
        className="absolute top-[-10%] right-[-5%] w-[800px] h-[700px] rounded-full blur-[150px] pointer-events-none transition-colors duration-1000 ease-in-out -z-10"
        style={{ backgroundColor: 'var(--app-active-ambiance, transparent)' }}
      />

      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 mr-4 my-4 relative">
        <TopBar
          settings={settings}
          syncState={syncState}
          isAuthenticated={isAuthenticated}
          activePanel={activePanel}
          onTogglePanel={handleTogglePanel}
          unreadNotificationsCount={notifications.filter((n) => !n.read).length}
        />

        {/* Because the glow is now in the background, we make this container slightly translucent to let it shine through */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-secondary/80 rounded-[2rem] border border-modifier/30 shadow-2xl backdrop-blur-xl relative z-0">
          {children}
        </main>
      </div>

      {/* --- AAA ACTION CENTER DRAWER --- */}
      <AnimatePresence>
        {activePanel && (
          <>
            {/* Dark Backdrop (Blur removed for performance) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setActivePanel(null)}
              className="absolute inset-0 z-40 bg-black/60"
            />

            {/* The Sliding Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              // Tween is significantly cheaper to calculate than spring physics
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }}
              // Hardware Acceleration force
              style={{ willChange: 'transform' }}
              // Removed backdrop-blur-2xl and heavy custom shadow. Using solid bg-secondary.
              className="absolute right-0 top-0 bottom-0 w-80 z-50 bg-secondary border-l border-modifier shadow-2xl flex flex-col"
            >
              {/* --- 1. HEADER AREA --- */}
              <div className="h-20 flex items-center justify-between px-6 border-b border-modifier shrink-0 bg-primary/80">
                <h2 className="text-textMain font-bold flex items-center gap-2">
                  {activePanel === 'downloads' ? (
                    <>
                      <Download size={18} className="text-accent" /> Network Tasks
                    </>
                  ) : (
                    <>
                      <Bell size={18} className="text-danger" /> System Alerts
                    </>
                  )}
                </h2>
                <button
                  onClick={() => setActivePanel(null)}
                  className="p-2 text-textMuted hover:text-textMain hover:bg-modifier/50 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* --- 2. SCROLLABLE CONTENT AREA --- */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
                {/* A. DOWNLOADS TAB */}
                {activePanel === 'downloads' && (
                  <div className="flex flex-col gap-3">
                    {networkTasks?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-textMuted/50 gap-3">
                        <Server size={32} className="opacity-20" />
                        <p className="text-sm font-medium text-center">
                          No active network tasks.
                          <br />
                          Systems idling.
                        </p>
                      </div>
                    ) : (
                      networkTasks?.map((task) => (
                        <motion.div
                          key={task.id}
                          layout="position" // Optimized layout calculation
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="p-4 rounded-xl bg-modifier/20 border border-modifier/30 flex flex-col gap-3 relative overflow-hidden group"
                        >
                          {/* Top row: Icon, Title, Status */}
                          <div className="flex gap-3 items-center">
                            <div
                              className={`p-2 rounded-lg shrink-0 ${
                                task.status === 'error'
                                  ? 'bg-danger/20 text-danger'
                                  : task.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-accent/20 text-accent'
                              }`}
                            >
                              {task.type === 'upload' ? (
                                <Server size={16} />
                              ) : (
                                <Download size={16} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-textMain truncate">
                                {task.title}
                              </h4>
                              <p className="text-xs text-textMuted flex items-center justify-between mt-0.5">
                                <span>
                                  {task.status === 'active'
                                    ? task.type === 'upload'
                                      ? 'Encrypting & Uploading...'
                                      : 'Downloading...'
                                    : task.status === 'completed'
                                      ? 'Secured'
                                      : 'Failed'}
                                </span>
                                <span className="font-mono">{Math.round(task.progress)}%</span>
                              </p>
                            </div>
                          </div>

                          {/* AAA Progress Bar */}
                          <div className="h-1.5 w-full bg-modifier/50 rounded-full overflow-hidden relative">
                            <motion.div
                              className={`absolute top-0 bottom-0 left-0 rounded-full ${
                                task.status === 'error'
                                  ? 'bg-danger shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                  : task.status === 'completed'
                                    ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                                    : 'bg-accent shadow-[0_0_10px_rgba(0,194,255,0.5)]'
                              }`}
                              style={{ willChange: 'width' }} // GPU optimization for the progress bar
                              initial={{ width: 0 }}
                              animate={{ width: `${task.progress}%` }}
                              transition={{ type: 'tween', ease: 'linear', duration: 0.1 }} // Less intensive progress fill
                            />
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                )}

                {/* B. NOTIFICATIONS TAB */}
                {activePanel === 'notifications' && (
                  <div className="flex flex-col gap-3">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-textMuted/50 gap-3">
                        <Bell size={32} className="opacity-20" />
                        <p className="text-sm font-medium text-center">
                          System logs empty.
                          <br />
                          No recent alerts.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        // Dynamically assign styling based on the notification type
                        const styleMap = {
                          info: {
                            color: 'text-accent',
                            bg: 'bg-accent/20',
                            line: 'bg-accent',
                            Icon: Info
                          },
                          success: {
                            color: 'text-emerald-400',
                            bg: 'bg-emerald-500/20',
                            line: 'bg-emerald-400',
                            Icon: CheckCircle2
                          },
                          warning: {
                            color: 'text-amber-400',
                            bg: 'bg-amber-500/20',
                            line: 'bg-amber-400',
                            Icon: AlertTriangle
                          },
                          error: {
                            color: 'text-danger',
                            bg: 'bg-danger/20',
                            line: 'bg-danger',
                            Icon: AlertTriangle
                          }
                        }
                        const config = styleMap[notif.type] || styleMap.info
                        const timeString = new Date(notif.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })

                        return (
                          <motion.div
                            key={notif.id}
                            layout="position"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-4 rounded-xl bg-modifier/20 border border-modifier/30 flex gap-4 items-start relative overflow-hidden ${!notif.read ? 'bg-modifier/40' : ''}`}
                          >
                            <div
                              className={`absolute left-0 top-0 bottom-0 w-1 ${config.line} ${!notif.read ? 'animate-pulse' : 'opacity-50'}`}
                            />
                            <div className={`p-2 rounded-lg shrink-0 ${config.bg} ${config.color}`}>
                              <config.Icon size={18} />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-textMain">{notif.title}</h4>
                              <p className="text-xs text-textMuted mt-1 leading-relaxed">
                                {notif.message}
                              </p>
                              <span className="text-[10px] font-bold text-textMuted/50 uppercase mt-2 block">
                                {timeString}
                              </span>
                            </div>
                          </motion.div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
