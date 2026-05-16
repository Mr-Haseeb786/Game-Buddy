export interface RawgGame {
  id: number
  name: string
  background_image: string
  released: string
  rating: number
}

export interface RawgSearchResponse {
  count: number
  next: string | null
  previous: string | null
  results: RawgGame[]
}
