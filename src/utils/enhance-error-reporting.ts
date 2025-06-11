import { logger } from './logger'

export function enhanceErrorReporting() {
  window.addEventListener('error', event => {
    const { message, filename, lineno, colno, error } = event
    const payload = {
      type: 'SYNC_ERROR',
      message,
      file: filename,
      line: lineno,
      column: colno,
      stack: error?.stack || 'No stack',
      error,
    }
    logger.error('[Media Recorder] Unhandled Error:', payload)
    // Send to backend: fetch('/log-error', { method: 'POST', body: JSON.stringify(payload) })
  })

  window.addEventListener('unhandledrejection', event => {
    logger.error('[Media Recorder] Unhandled Rejection:', {
      reason: event.reason,
      type: event.type,
    })
  })
}
