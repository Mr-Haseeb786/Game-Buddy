# GameBuddy: Architecture & Context Document

This document serves as a comprehensive reference guide for the GameBuddy application's backend logic, cloud synchronization engine, and state management architecture. It is designed to provide complete context to developers and AI assistants (like Cursor, GitHub Copilot) working on this codebase.

## 1. High-Level Architecture

GameBuddy is a desktop application built on **Electron, React, TypeScript, and Vite**. It manages a user's local game library (`library.json`) and provides robust, memory-efficient backup, restore, and synchronization with **Google Drive's hidden `appDataFolder`**.

### The IPC Bridge Model

The application adheres strictly to Electron's security model. The React frontend (`Renderer`) never touches the file system or Google Drive directly. All heavy lifting is routed through strictly typed IPC (Inter-Process Communication) handlers exposed via the `Preload` script.

---

## 2. File Structure & Responsibilities

### Main Process (Backend)

- **`src/main/index.ts`**
  - **Role:** The central nervous system. Handles window creation and registers all `ipcMain.handle` endpoints.
  - **Key Handlers:**
    - `load-library` / `save-library`: Reads/Writes `library.json` locally.
    - `restore-from-cloud`: Executes the "Self-Healing Sweep" and merges JSON data.
    - `sync-game-save`: The entry point for the Backup engine.
    - `restore-game-save`: Pops the native OS `dialog.showSaveDialog` and triggers the stream download.
    - `delete-cloud-save`: Permanent Drive deletion.
    - `get-cloud-stats`: Fetches metadata for the Cloud Storage Manager.

- **`src/main/drive.ts`**
  - **Role:** The Google Drive Engine.
  - **Key Features:**
    - Uses **JSZip** and native Node `fs.createReadStream` to zip folders and stream them byte-by-byte directly to Google Drive, preventing RAM exhaustion.
    - Calculates dynamic progress (`0-100%`) for both uploads and downloads.
    - `mergeLibraries()`: Combines local and cloud JSONs (Local wins tie-breakers).
    - Manages Drive API calls specifically locked to the `appDataFolder` scope.

- **`src/main/auth.ts`**
  - **Role:** Google OAuth2 flow using local PKCE server redirects.

- **`src/main/scanner.ts`**
  - **Role:** Local file system tree scanning for save directories.

### Preload & Shared

- **`src/preload/index.ts`**
  - **Role:** Maps backend IPC handlers to the `window.api` object.
- **`src/shared/types.ts`**
  - **Role:** The source of truth for TypeScript interfaces (`LibraryData`, `GameEntry`, `CloudSaveStat`, `ElectronAPI`).

### Renderer Process (Frontend)

- **`src/renderer/src/App.tsx`**
  - **Role:** The central state manager. Owns the `library` state.
  - **State Paradigm:** Strictly uses **Functional State Updates** (`setLibrary(prev => ...)`) for all Add, Update, and Remove operations. This prevents "Stale State Closures" and guarantees the UI is always perfectly synced with the backend disk writes.
  - **Key Orchestrations:** Hydration on boot, Orphan Recovery when adding games, passing cleanup callbacks to Modals.

- **`src/renderer/src/components/ManageGameModal.tsx`**
  - **Role:** Game properties editor and the **Dual-Delete System**.
  - **Danger Zone:** Allows users to remove a game from local tracking _only_, or aggressively delete the local entry _and_ the Google Drive ZIP.

- **`src/renderer/src/components/CloudManagerModal.tsx`**
  - **Role:** A real-time window into the user's hidden Google Drive `appDataFolder`.
  - **Features:** Displays archive sizes, timestamps, and provides a custom warning UI to permanently delete specific ZIPs. Triggers `onFileDeleted` to force `App.tsx` to unlink the file ID.

- **`src/renderer/src/components/BackupModal.tsx`**
  - **Role:** Displays the scanned local save tree. Allows the user to select specific files/folders to zip and push to the cloud.

---

## 3. Core Engine Mechanics

### 1. The Backup Engine (Streaming Zipping)

- **Flow:** React (`BackupModal`) passes an array of selected file paths to Node -> `drive.ts` initializes `JSZip` -> Native `fs.createReadStream` pipes local files into JSZip -> JSZip `generateNodeStream` pipes directly into the Google Drive API.
- **Update Logic:** If the game already has a `cloudSaveId`, the API calls `drive.files.update` (overwriting the file). If not, it calls `drive.files.create`.

### 2. The Restore Engine

- **Flow:** React triggers restore -> Node opens native save dialog -> User selects path -> Node reads Drive stream and pipes it to a local `createWriteStream` -> Uses `shell.showItemInFolder` for instant UX feedback.
- **Scope Pivot:** To avoid cross-device absolute pathing nightmares, the engine operates as a "Download To..." system, allowing the user to manually drop the restored files into their rightful place.

### 3. Orphan Recovery (Add Game)

- **Problem:** If a user deletes a game locally but keeps the cloud save, re-adding the game creates a fresh entry with `cloudSaveId: null`, ignoring the existing ZIP.
- **Solution:** When `handleAddGameFromSearch` fires, the frontend silently queries Google Drive for a filename matching `${gameTitle.replace(/[^a-z0-9]/gi, '_')}_save.zip`. If found, it automatically stitches the `cloudSaveId` into the new game object.

### 4. Self-Healing Sweep (Manual Sync / Boot Hydration)

- **Trigger:** When the app loads or the user clicks "Sync with Cloud Library".
- **Execution (`restore-from-cloud`):**
  1. Fetches local `library.json`.
  2. Fetches cloud `library.json`.
  3. Merges them.
  4. **The Sweep:** Fetches a list of all physical ZIP files in Google Drive. It loops over the merged library and mathematically checks if every game's ZIP still exists.
  5. **Correction:** If a game has a `cloudSaveId` but the ZIP is gone (deleted via Drive UI or Manager), it unlinks it (`null`). If an orphaned ZIP exists for a game that doesn't have an ID, it links it.
  6. Saves the healed JSON to disk and pushes it back to the cloud.

### 5. Stale State Defense

- Instead of waiting for disk `await`, state functions (e.g., `handleCloudSaveDeleted`) mutate the local UI immediately using `prev` state, and dispatch the `window.api.saveLibrary()` call in the background as a "fire-and-forget" Promise. This ensures the React UI never falls out of sync with the hard drive.
