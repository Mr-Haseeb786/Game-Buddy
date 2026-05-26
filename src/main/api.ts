import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

const CACHE_FILE = path.join(app.getPath('userData'), 'rawg_cache.json')
const CACHE_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

// WARNING: In production, load this from a .env file!
const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY
const BASE_URL = 'https://api.rawg.io/api'

interface CacheStore {
  [endpointKey: string]: {
    timestamp: number
    data: any
  }
}

// --- CORE CACHE LOGIC ---

async function readCache(): Promise<CacheStore> {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {} // Return empty cache if file doesn't exist or is corrupted
  }
}

async function writeCache(store: CacheStore): Promise<void> {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(store), 'utf-8')
  } catch (error) {
    console.error('Failed to write RAWG cache to disk:', error)
  }
}

// --- THE SMART FETCHER ---

/**
 * Acts as a proxy to RAWG. Checks cache first, handles errors gracefully.
 */
async function fetchFromRAWG(endpoint: string, queryParams: string, forceRefresh: boolean = false) {
  const cacheKey = `${endpoint}?${queryParams}`

  // 1. Check Cache (Unless user clicked the force refresh button)
  if (!forceRefresh) {
    const cache = await readCache()
    const cachedItem = cache[cacheKey]

    if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL_MS) {
      console.log(`[API Proxy] Serving ${cacheKey} from local cache.`)
      return { success: true, data: cachedItem.data }
    }
  }

  // 2. Fetch Fresh Data
  try {
    console.log(`[API Proxy] Fetching fresh data for ${cacheKey}...`)
    const url = `${BASE_URL}/${endpoint}?key=${RAWG_API_KEY}&${queryParams}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`RAWG API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // 3. Save to Cache
    const cache = await readCache()
    cache[cacheKey] = {
      timestamp: Date.now(),
      data: data
    }
    await writeCache(cache)

    return { success: true, data }
  } catch (error: any) {
    console.error(`[API Proxy Error] ${error.message}`)
    // Return a safe object so React doesn't crash, allowing it to show a nice error UI
    return {
      success: false,
      error: 'Failed to fetch data from the gaming database. Please check your connection.'
    }
  }
}

// --- SPECIFIC ENDPOINTS EXPOSED TO IPC ---

export async function getDiscoverGames(
  category: string,
  forceRefresh: boolean = false,
  page: number = 1
) {
  // Map our UI categories to actual RAWG API parameters
  let params = `page_size=20&page=${page}`

  switch (category) {
    case 'trending':
      params += '&ordering=-added&dates=2023-01-01,2024-12-31'
      break
    case 'indie':
      params += '&genres=indie&ordering=-rating'
      break
    case 'horror':
      params += '&tags=horror&ordering=-rating'
      break
    default:
      params += '&ordering=-rating'
      break
  }

  return await fetchFromRAWG('games', params, forceRefresh)
}

export async function searchGames(query: string, forceRefresh: boolean = false) {
  const safeQuery = encodeURIComponent(query)
  return await fetchFromRAWG('games', `search=${safeQuery}&page_size=20`, forceRefresh)
}

export async function getGameDetails(id: number, forceRefresh: boolean = false) {
  // RAWG's /games/{id} endpoint doesn't require query parameters other than the key
  return await fetchFromRAWG(`games/${id}`, '', forceRefresh)
}

export async function getGameScreenshots(id: number, forceRefresh: boolean = false) {
  return await fetchFromRAWG(`games/${id}/screenshots`, '', forceRefresh)
}
