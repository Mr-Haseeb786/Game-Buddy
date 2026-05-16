import { RawgSearchResponse } from '../../../shared/rawg'

const API_KEY = import.meta.env.VITE_RAWG_API_KEY
const BASE_URL = 'https://api.rawg.io/api'

export const searchGames = async (query: string): Promise<RawgSearchResponse> => {
  if (!query) throw new Error('Search query is empty')

  const response = await fetch(
    `${BASE_URL}/games?key=${API_KEY}&search=${encodeURIComponent(query)}&page_size=12`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch games from RAWG')
  }

  return response.json()
}
