import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
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

      <div className="flex flex-col flex-1 min-w-0 mr-4 my-4">
        <TopBar />

        {/* Because the glow is now in the background, we make this container slightly translucent to let it shine through */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-secondary/80 rounded-[2rem] border border-modifier/30 shadow-2xl backdrop-blur-xl relative z-0">
          {children}
        </main>
      </div>
    </div>
  )
}
