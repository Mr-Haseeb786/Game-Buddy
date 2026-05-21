import fs from 'fs/promises'
import path from 'path'
import { ScannedFile, ScannedFolder } from '../shared/types'

/**
 * Extracts the base name strictly at the LAST dot.
 * Example: "q.save.0.sav" -> "q.save.0"
 */
function getStrictBaseName(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1 || lastDotIndex === 0) return filename
  return filename.substring(0, lastDotIndex)
}

/**
 * Recursively scans a directory and builds a safe, structured tree.
 */
export async function scanSaveDirectory(
  currentPath: string,
  rootDir: string = currentPath
): Promise<ScannedFolder | null> {
  try {
    const entries = await fs.readdir(currentPath, { withFileTypes: true })

    const folderName = path.basename(currentPath)
    const relativeFolderPath = path.relative(rootDir, currentPath).replace(/\\/g, '/') // Normalize slashes for ZIP

    const files: ScannedFile[] = []
    const subfolders: ScannedFolder[] = []

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name)

      try {
        if (entry.isDirectory()) {
          // Recursively scan subfolders
          const subfolderData = await scanSaveDirectory(absolutePath, rootDir)
          if (subfolderData) subfolders.push(subfolderData)
        } else if (entry.isFile()) {
          // Get strict stats for files
          const stats = await fs.stat(absolutePath)
          const relativePath = path.relative(rootDir, absolutePath).replace(/\\/g, '/')

          files.push({
            name: entry.name,
            absolutePath,
            relativePath,
            sizeBytes: stats.size,
            mtimeMs: stats.mtimeMs,
            baseName: getStrictBaseName(entry.name)
          })
        }
      } catch (fileError: any) {
        // EDGE CASE HANDLING: File locked by OS or game engine
        if (fileError.code === 'EPERM' || fileError.code === 'EBUSY') {
          console.warn(`Skipping locked/protected file: ${absolutePath}`)
          continue
        }
        throw fileError
      }
    }

    // Sort files internally by newest first so React doesn't have to do the heavy lifting
    files.sort((a, b) => b.mtimeMs - a.mtimeMs)

    return {
      name: folderName,
      absolutePath: currentPath,
      relativePath: relativeFolderPath || '', // Root folder has empty relative path
      files,
      subfolders
    }
  } catch (dirError: any) {
    if (dirError.code === 'ENOENT') {
      console.error(`Directory not found: ${currentPath}`)
      return null
    }
    throw dirError
  }
}
