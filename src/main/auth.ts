// src/main/auth.ts
import { google } from 'googleapis'
import { app, shell } from 'electron'
import http from 'http'
import { URL } from 'url'
import path from 'path'
import fs from 'fs/promises'

const REDIRECT_URI = 'http://localhost:3030/oauth2callback'

export const oauth2Client = new google.auth.OAuth2(
  import.meta.env.VITE_GOOGLE_CLIENT_ID,
  import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
)

const SCOPES = ['https://www.googleapis.com/auth/drive.appdata']
const getTokenPath = () => path.join(app.getPath('userData'), 'google-tokens.json')

// --- NEW: Global references for cancellation ---
let activeAuthServer: http.Server | null = null
let activeAuthReject: ((reason?: any) => void) | null = null
let authTimeout: NodeJS.Timeout | null = null

// Helper to clean up all global states securely
const cleanupAuthServer = () => {
  if (activeAuthServer) {
    activeAuthServer.closeAllConnections()
    activeAuthServer.close()
    activeAuthServer = null
  }
  if (authTimeout) {
    clearTimeout(authTimeout)
    authTimeout = null
  }
}

export async function checkExistingAuth(): Promise<boolean> {
  try {
    const tokenData = await fs.readFile(getTokenPath(), 'utf-8')
    oauth2Client.setCredentials(JSON.parse(tokenData))
    return true
  } catch (error) {
    return false
  }
}

export async function loginToGoogle(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Store the reject function so cancelGoogleLogin can call it later
    activeAuthReject = reject

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    })

    activeAuthServer = http.createServer(async (req, res) => {
      try {
        if (req.url && req.url.startsWith('/oauth2callback')) {
          const requestUrl = new URL(req.url, 'http://localhost:3030')
          const code = requestUrl.searchParams.get('code')

          if (code) {
            res.end(
              '<h1>Authentication successful!</h1><p>You can close this tab and return to the app.</p>'
            )
            cleanupAuthServer() // Clean up safely

            const { tokens } = await oauth2Client.getToken(code)
            oauth2Client.setCredentials(tokens)
            await fs.writeFile(getTokenPath(), JSON.stringify(tokens), 'utf-8')

            resolve(true)
          } else {
            res.end('<h1>Authentication failed.</h1>')
            cleanupAuthServer()
            reject(new Error('No code provided by Google'))
          }
        }
      } catch (error) {
        cleanupAuthServer()
        reject(error)
      }
    })

    activeAuthServer.listen(3030, () => shell.openExternal(authUrl))

    // Keep the safety net timeout
    authTimeout = setTimeout(() => {
      cleanupAuthServer()
      reject(new Error('Login timed out.'))
    }, 180000)
  })
}

// --- NEW: The Cancel Function ---
export function cancelGoogleLogin() {
  cleanupAuthServer()
  if (activeAuthReject) {
    activeAuthReject(new Error('USER_CANCELLED'))
    activeAuthReject = null
  }
}

export async function logoutFromGoogle(): Promise<boolean> {
  try {
    await oauth2Client.revokeCredentials()
  } catch (err) {}
  try {
    await fs.unlink(getTokenPath())
    oauth2Client.setCredentials({})
    return true
  } catch (error) {
    return false
  }
}
