import { isTauri } from '@tauri-apps/api/core'

/** Height of the fixed Navbar, which doubles as the titlebar on desktop. */
export const NAV_H = 54

/**
 * True in the desktop app, where the window is app chrome that never scrolls:
 * the header stays put and only the content pane below it scrolls. On the web
 * the document scrolls normally, so this is false there.
 */
export const NATIVE_SHELL = typeof window !== 'undefined' && isTauri()
