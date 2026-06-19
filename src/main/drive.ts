import { google } from 'googleapis'
import { oauth2Client } from './auth'
import { CloudSaveStat, GameEntry, LibraryData, ScannedFile } from '../shared/types'
import { createWriteStream, createReadStream } from 'fs'
import JSZip from 'jszip'
import { Readable } from 'stream'

// Initialize the Drive API client
const drive = google.drive({ version: 'v3', auth: oauth2Client })

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const isAuthError = (error: any) => {
  const msg = error?.message || error?.response?.data?.error || error?.cause?.message || ''
  return msg === 'invalid_grant' || msg.includes('invalid_grant')
}

// --- NEW: THE TRANSPARENT VAULT MANAGER ---
async function getOrCreateSynapseFolder(): Promise<string> {
  const folderName = 'Synapse_Backups'

  try {
    // 1. Check if the folder already exists (and isn't in the trash)
    const searchResponse = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)'
    })

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      return searchResponse.data.files[0].id!
    }

    // 2. If it doesn't exist, create it in the root of their Drive
    const createResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    })

    console.log('Created new Synapse_Backups folder in Google Drive.')
    return createResponse.data.id!
  } catch (error) {
    if (isAuthError(error)) throw new Error('AUTH_EXPIRED')
    console.error('Failed to get/create Synapse folder:', error)
    throw new Error('Could not access Drive folder.')
  }
}

export async function syncLibraryToDrive(
  libraryData: LibraryData,
  maxRetries = 3
): Promise<boolean> {
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      const folderId = await getOrCreateSynapseFolder()
      const searchResponse = await drive.files.list({
        // spaces: 'appDataFolder',
        q: `name='library.json' and '${folderId}' in parents and trashed=false`, // <-- UPDATED
        fields: 'files(id)'
      })

      const files = searchResponse.data.files
      const media = { mimeType: 'application/json', body: JSON.stringify(libraryData) }

      if (files && files.length > 0) {
        await drive.files.update({ fileId: files[0].id!, media: media })
      } else {
        await drive.files.create({
          requestBody: { name: 'library.json', parents: [folderId] },
          media: media
        })
      }

      console.log(`Cloud sync successful on attempt ${attempt + 1}`)
      return true // Success! Exit the loop.
    } catch (error: any) {
      if (isAuthError(error)) throw new Error('AUTH_EXPIRED')
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
    const folderId = await getOrCreateSynapseFolder()
    const searchResponse = await drive.files.list({
      q: `name='library.json' and '${folderId}' in parents and trashed=false`,
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
    if (isAuthError(error)) throw new Error('AUTH_EXPIRED')
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
  return new Promise(async (resolve, reject) => {
    try {
      const zip = new JSZip()

      // 1. Append files (JSZip still reads them efficiently from the hard drive)
      filesToZip.forEach((file) => {
        zip.file(file.relativePath || file.name, createReadStream(file.absolutePath))
      })

      // 2. Grab the folder ID *BEFORE* we process the zip
      const folderId = await getOrCreateSynapseFolder()

      // 3. THE FIX: Generate a Buffer instead of a Node Stream.
      // Google's 'update' endpoint silently fails and drops streams that lack a Content-Length.
      // Generating a Buffer provides the exact file size natively, fixing the empty zip bug!
      const zipBuffer = await zip.generateAsync(
        {
          type: 'nodebuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 9 }
        },
        (metadata) => {
          // Progress bar still works perfectly!
          onProgress(Math.min(Math.round(metadata.percent), 99))
        }
      )

      // 4. Prepare the Drive upload payload
      const media = {
        mimeType: 'application/zip',
        body: Readable.from(zipBuffer)
      }

      const driveFileName = `${gameTitle.replace(/[^a-z0-9]/gi, '_')}_save.zip`

      // 5. Push to Google Drive
      if (existingCloudSaveId) {
        await drive.files.update({
          fileId: existingCloudSaveId,
          media: media
        })
        onProgress(100)
        resolve(existingCloudSaveId)
      } else {
        const response = await drive.files.create({
          requestBody: {
            name: driveFileName,
            parents: [folderId]
          },
          media: media,
          fields: 'id'
        })
        onProgress(100)
        resolve(response.data.id!)
      }
    } catch (error: any) {
      if (isAuthError(error)) return reject(new Error('AUTH_EXPIRED'))
      reject(error)
    }
  })
}

export async function getCloudStorageStats(): Promise<CloudSaveStat[]> {
  try {
    const folderId = await getOrCreateSynapseFolder() // <-- ADD THIS
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`, // <-- UPDATED
      fields: 'files(id, name, size, modifiedTime)'
    })

    const files = response.data.files || []

    // Filter out library.json and map the rest to our strict TypeScript interface
    return (
      files
        .filter((f) => f.name !== 'library.json')
        .map((f) => ({
          id: f.id!,
          name: f.name!,
          sizeBytes: parseInt(f.size || '0', 10),
          modifiedTime: f.modifiedTime!
        }))
        // Sort by newest first
        .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
    )
  } catch (error) {
    if (isAuthError(error)) throw new Error('AUTH_EXPIRED')
    console.error('Failed to fetch cloud storage stats:', error)
    throw new Error('Could not read Google Drive storage')
  }
}

export async function deleteCloudSave(fileId: string): Promise<boolean> {
  try {
    await drive.files.delete({ fileId })
    return true
  } catch (error) {
    if (isAuthError(error)) throw new Error('AUTH_EXPIRED')
    console.error(`Failed to delete file ${fileId} from Drive:`, error)
    throw new Error('Could not delete file from Google Drive')
  }
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
    const folderId = await getOrCreateSynapseFolder() // <-- ADD THIS

    const searchResponse = await drive.files.list({
      q: `name='library.json' and '${folderId}' in parents and trashed=false`,
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

export async function downloadSaveFromDrive(
  cloudSaveId: string,
  destinationPath: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Get the exact file size for the progress bar
      const meta = await drive.files.get({
        fileId: cloudSaveId,
        fields: 'size'
      })
      const totalBytes = parseInt(meta.data.size || '0', 10)

      // 2. Request the actual file data as a binary stream
      const response = await drive.files.get(
        { fileId: cloudSaveId, alt: 'media' },
        { responseType: 'stream' } // Critical: prevents loading the whole file into RAM
      )

      // 3. Open a pipeline to the user's chosen folder
      const destStream = createWriteStream(destinationPath)

      let downloadedBytes = 0

      // 4. Listen to the data chunks as they arrive to calculate progress
      response.data.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length
        if (totalBytes > 0) {
          const percent = Math.round((downloadedBytes / totalBytes) * 100)
          onProgress(Math.min(percent, 100))
        }
      })

      // 5. Pipe the cloud stream into the local hard drive stream
      response.data.pipe(destStream)

      // 6. Finish up
      destStream.on('finish', () => resolve())
      destStream.on('error', (err) => reject(err))
    } catch (error) {
      if (isAuthError(error)) return reject(new Error('AUTH_EXPIRED'))
      console.error('Drive download stream failed:', error)
      reject(error)
    }
  })
}
