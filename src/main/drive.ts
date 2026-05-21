import { google } from 'googleapis'
import { oauth2Client } from './auth'
import { GameEntry, LibraryData, ScannedFile } from '../shared/types'
import archiver from 'archiver'

// Initialize the Drive API client
const drive = google.drive({ version: 'v3', auth: oauth2Client })

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function syncLibraryToDrive(
  libraryData: LibraryData,
  maxRetries = 3
): Promise<boolean> {
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      const searchResponse = await drive.files.list({
        spaces: 'appDataFolder',
        q: "name='library.json'",
        fields: 'files(id)'
      })

      const files = searchResponse.data.files
      const media = { mimeType: 'application/json', body: JSON.stringify(libraryData) }

      if (files && files.length > 0) {
        await drive.files.update({ fileId: files[0].id!, media: media })
      } else {
        await drive.files.create({
          requestBody: { name: 'library.json', parents: ['appDataFolder'] },
          media: media
        })
      }

      console.log(`Cloud sync successful on attempt ${attempt + 1}`)
      return true // Success! Exit the loop.
    } catch (error: any) {
      attempt++
      console.error(`Sync attempt ${attempt} failed:`, error.message)

      if (attempt >= maxRetries) {
        throw new Error('Max retries reached. Sync failed.')
      }

      // Exponential backoff: Wait 2s, then 4s, then 8s
      const backoffTime = Math.pow(2, attempt) * 1000
      await delay(backoffTime)
    }
  }
  return false
}

export async function downloadLibraryFromDrive(): Promise<LibraryData | null> {
  try {
    // 1. Search for the file in the hidden folder
    const searchResponse = await drive.files.list({
      spaces: 'appDataFolder',
      q: "name='library.json'",
      fields: 'files(id)'
    })

    const files = searchResponse.data.files

    if (!files || files.length === 0) {
      console.log('No cloud save found. User is starting fresh.')
      return null
    }

    // 2. File found! Download the actual JSON content
    const fileId = files[0].id!
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media' // This tells Google to return the file contents, not metadata
    })

    console.log('Successfully downloaded library from Google Drive.')
    return response.data as LibraryData
  } catch (error) {
    console.error('Error downloading from Drive:', error)
    throw new Error('Failed to fetch cloud save.')
  }
}

export async function uploadSaveToDrive(
  gameTitle: string,
  filesToZip: ScannedFile[],
  existingCloudSaveId: string | null,
  onProgress: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Calculate total bytes for the progress bar
    const totalBytes = filesToZip.reduce((sum, file) => sum + file.sizeBytes, 0)

    // 2. Initialize the Archiver stream
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    })

    archive.on('error', (err) => reject(err))

    // 3. Track progress and emit to React
    archive.on('progress', (progress) => {
      if (totalBytes > 0) {
        const percent = Math.round((progress.fs.processedBytes / totalBytes) * 100)
        // Cap at 99% until Google Drive confirms the final byte
        onProgress(Math.min(percent, 99))
      }
    })

    // 4. Append the selected files exactly as structured
    filesToZip.forEach((file) => {
      // The `name` property dictates the exact folder structure inside the ZIP
      archive.file(file.absolutePath, { name: file.relativePath || file.name })
    })

    // Finalize the archive (tells the stream no more files are coming)
    archive.finalize()

    // 5. Pipe the stream directly to Google Drive
    const media = {
      mimeType: 'application/zip',
      body: archive // archiver is a valid Node Readable stream!
    }

    const driveFileName = `${gameTitle.replace(/[^a-z0-9]/gi, '_')}_save.zip`

    const uploadTask = async () => {
      try {
        if (existingCloudSaveId) {
          // Overwrite existing save
          await drive.files.update({
            fileId: existingCloudSaveId,
            media: media
          })
          onProgress(100)
          resolve(existingCloudSaveId)
        } else {
          // Create new save
          const response = await drive.files.create({
            requestBody: {
              name: driveFileName,
              parents: ['appDataFolder']
            },
            media: media,
            fields: 'id'
          })
          onProgress(100)
          resolve(response.data.id!)
        }
      } catch (uploadError) {
        reject(uploadError)
      }
    }

    uploadTask()
  })
}

export function mergeLibraries(local: LibraryData, cloud: LibraryData): LibraryData {
  // Start with a copy of the cloud games
  const mergedGames: Record<string, GameEntry> = { ...cloud.games }

  // Iterate through all the local games
  for (const [id, localGame] of Object.entries(local.games)) {
    const cloudGame = cloud.games[id]

    if (!cloudGame) {
      // Scenario A: Game is only on Local (User added it offline)
      mergedGames[id] = localGame
    } else {
      // Scenario B: Conflict! Game is in both places.
      // Compare the per-game timestamps. Local wins if it is strictly newer.
      // (Fallback to 0 if a timestamp is missing on old data)
      const localTime = localGame.updatedAt || 0
      const cloudTime = cloudGame.updatedAt || 0

      if (localTime > cloudTime) {
        mergedGames[id] = localGame
      }
      // If cloud is newer (or equal), we just leave the cloudGame in the merged result.
    }
  }

  return {
    lastUpdated: new Date().toISOString(),
    games: mergedGames
  }
}

// Temporary drive appData folder content checking function

export async function testListHiddenFiles() {
  try {
    const searchResponse = await drive.files.list({
      spaces: 'appDataFolder',
      fields: 'files(id, name, size)' // Ask Google for the name and size
    })

    console.log('\n--- HIDDEN GOOGLE DRIVE FILES ---')
    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      searchResponse.data.files.forEach((file) => {
        // Convert bytes to MB for easy reading
        const sizeMB = file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) : 'Unknown'
        console.log(`📄 ${file.name} | ID: ${file.id} | Size: ${sizeMB} MB`)
      })
    } else {
      console.log('No files found in the hidden folder.')
    }
    console.log('---------------------------------\n')
  } catch (error) {
    console.error('Failed to list hidden files:', error)
  }
}
