import { Bell, Download } from 'lucide-react'
import { useUI } from '../../context/UIContext'

export default function TopBar() {
  const { currentPage } = useUI()

  // Capitalize the current page for the title
  const pageTitle = currentPage.charAt(0).toUpperCase() + currentPage.slice(1)

  return (
    // The `drag-region` class will be defined in our CSS to let the user drag the window
    <header className="h-16 flex items-center justify-between px-8 shrink-0 drag-region z-10">
      {/* Page Title */}
      <div className="flex items-center gap-4 no-drag">
        <h1 className="text-2xl font-black text-textMain tracking-wide">
          {pageTitle === 'Search' ? 'Discover' : pageTitle}
        </h1>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4 no-drag">
        {/* Sync Status / Downloads (Placeholder) */}
        <button className="p-2 text-textMuted hover:text-accent bg-modifier/30 hover:bg-modifier/80 rounded-xl transition-all">
          <Download size={20} />
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-textMuted hover:text-accent bg-modifier/30 hover:bg-modifier/80 rounded-xl transition-all">
          <Bell size={20} />
          {/* Notification Dot */}
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-danger rounded-full border-2 border-primary" />
        </button>

        {/* User Profile Mini */}
        <div className="flex items-center gap-3 pl-4 border-l border-modifier/50 ml-2 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-textMain">Haseeb Shahid</p>
            <p className="text-xs text-textMuted font-medium">Online</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-purple-500 shadow-lg flex items-center justify-center text-white font-bold">
            HS
          </div>
        </div>
      </div>
    </header>
  )
}
