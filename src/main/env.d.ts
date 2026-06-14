/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Define your custom environment variables here
  readonly VITE_RAWG_API_KEY: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_CLIENT_SECRET: string
  // Add any others you might have created!
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
