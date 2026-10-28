const LEGACY_STORAGE_KEY = 'devtoolbox-notes'
const DATABASE_NAME = 'devtoolbox-notes'
const DATABASE_VERSION = 1
const SNAPSHOT_STORE = 'snapshots'
const SNAPSHOT_KEY = 'notes'

let databasePromise: Promise<IDBDatabase> | null = null
let writeQueue: Promise<void> = Promise.resolve()
let useLegacyFallback = false

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB is unavailable'))
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SNAPSHOT_STORE)) {
        request.result.createObjectStore(SNAPSHOT_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open notes storage'))
  })

  return databasePromise
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save notes'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Notes save was aborted'))
  })
}

async function readDatabaseSnapshot<T>(): Promise<T[] | null> {
  const database = await openDatabase()
  const transaction = database.transaction(SNAPSHOT_STORE, 'readonly')
  const request = transaction.objectStore(SNAPSHOT_STORE).get(SNAPSHOT_KEY)
  const value = await new Promise<unknown>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not load notes'))
  })
  return Array.isArray(value) ? value as T[] : null
}

async function writeDatabaseSnapshot<T>(notes: readonly T[]): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(SNAPSHOT_STORE, 'readwrite')
  transaction.objectStore(SNAPSHOT_STORE).put(notes, SNAPSHOT_KEY)
  await transactionDone(transaction)
}

function readLegacySnapshot<T>(): T[] | null {
  try {
    const value = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (value === null) return null
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed as T[] : null
  } catch {
    return null
  }
}

/** Loads asynchronously and migrates the existing localStorage notebook once. */
export async function loadNotesSnapshot<T>(): Promise<T[]> {
  const legacy = readLegacySnapshot<T>()
  if (legacy) {
    try {
      await writeDatabaseSnapshot(legacy)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // Keep the legacy copy when IndexedDB is unavailable.
    }
    return legacy
  }

  try {
    return await readDatabaseSnapshot<T>() ?? []
  } catch {
    return []
  }
}

/**
 * Writes away from the React input event and serializes writes so an older,
 * slower write can never overwrite a newer edit.
 */
export function saveNotesSnapshot<T>(notes: readonly T[]): Promise<void> {
  const snapshot = notes.slice()
  const write = async () => {
    if (useLegacyFallback) {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(snapshot))
      return
    }

    try {
      await writeDatabaseSnapshot(snapshot)
    } catch (databaseError) {
      useLegacyFallback = true
      try {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(snapshot))
      } catch {
        throw databaseError
      }
    }
  }

  writeQueue = writeQueue.catch(() => undefined).then(write)
  return writeQueue
}

/** Last-chance synchronous backup for an app/window close. */
export function saveNotesEmergency<T>(notes: readonly T[]): void {
  try {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(notes))
  } catch {
    // Async storage remains the source of truth if this exceeds the fallback cap.
  }
}
