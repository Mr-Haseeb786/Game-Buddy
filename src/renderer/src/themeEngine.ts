import chroma from 'chroma-js'
import { ChassisType, CustomThemePayload } from 'src/shared/types'

// The foundational base coats. We map these directly to your Tailwind @theme variables.
export const CHASSIS_PRESETS: Record<ChassisType, Record<string, string>> = {
  obsidian: {
    '--app-bg-primary': '#0a0a0a',
    '--app-bg-secondary': '#121212',
    '--app-bg-modifier': '#1f1f1f',
    '--app-text-main': '#ffffff',
    '--app-text-muted': '#9ca3af'
  },
  oled: {
    '--app-bg-primary': '#000000',
    '--app-bg-secondary': '#050505',
    '--app-bg-modifier': '#0a0a0a',
    '--app-text-main': '#f3f4f6',
    '--app-text-muted': '#6b7280'
  },
  midnight: {
    '--app-bg-primary': '#050b14',
    '--app-bg-secondary': '#0a1220',
    '--app-bg-modifier': '#132035',
    '--app-text-main': '#e2e8f0',
    '--app-text-muted': '#94a3b8'
  }
}

/**
 * Derives a full CSS variable dictionary from a single accent color and chassis type.
 */
export const generateThemeMatrix = (payload: CustomThemePayload): Record<string, string> | null => {
  if (!payload || !payload.enabled) return null

  // 1. Grab the base chassis
  const baseColors = CHASSIS_PRESETS[payload.chassis] || CHASSIS_PRESETS.obsidian

  // 2. Initialize the Energy Core
  // Fallback to a safe blue if the hex is somehow invalid
  const core = chroma.valid(payload.energyCore) ? chroma(payload.energyCore) : chroma('#00c2ff')

  // 3. The Math
  // If the core color is super bright (like neon yellow), darkening it makes a better hover state.
  // If it's a deep red or blue, brightening it is better.
  const accentHover = core.luminance() > 0.4 ? core.darken(0.4).hex() : core.brighten(0.6).hex()

  // Create the transparent glow effect for the Ambience Engine and Sidebar selection
  const activeAmbiance = core.alpha(0.15).css()

  return {
    ...baseColors,
    '--app-accent': core.hex(),
    '--app-accent-hover': accentHover,
    '--app-active-ambiance': activeAmbiance,
    '--app-danger': '#ef4444' // Keep standard danger red, or calculate: core.set('hsl.h', '+120').hex()
  }
}
