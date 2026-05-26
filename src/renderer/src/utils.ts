export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function formatTimeAgo(epochMs: number): string {
  const diff = (Date.now() - epochMs) / 1000 // seconds
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`
  return `${Math.floor(diff / 86400)} days ago`
}

// A stable hash function to consistently assign the same color to the same base name
export function getBaseNameColor(baseName: string): string {
  const colors = [
    'text-green-400',
    'text-blue-400',
    'text-purple-400',
    'text-yellow-400',
    'text-pink-400',
    'text-cyan-400'
  ]
  let hash = 0
  for (let i = 0; i < baseName.length; i++) {
    hash = baseName.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}
