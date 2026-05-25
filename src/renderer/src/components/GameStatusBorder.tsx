import { motion } from 'framer-motion'
import { STATUS_CONFIG } from '../views/SearchView'

export default function GameStatusBorder({ status }: { status?: string }) {
  const config = status ? STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] : null
  const color = config?.color || '#3b82f6'

  return (
    <div className="absolute -inset-3 z-[100] pointer-events-none p-2 md:p-3">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0.3, 0.7, 0.3],
          boxShadow: [
            `inset 0 0 15px 0px ${color}`,
            `inset 0 0 30px 2px ${color}`,
            `inset 0 0 15px 0px ${color}`
          ]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full h-full rounded-[2.5rem] border-2"
        style={{ borderColor: color }}
      />
    </div>
  )
}
