import { logger } from "./logger"

export interface MimeType {
  type: string
  extension: string
}

//  If we use mp4 mimetypes, saving multiple chunks and merging them together won't be possible.
//  saving mp4 mimetypes is supported in safari but generated file is corrupted.
// video/webm;codecs=h264,opus
// video/webm;codecs=h264,vp9,opus
const mimeTypes: MimeType[] = [
  {
    type: 'video/webm; codecs=h264, opus',
    extension: '.webm',
  },
  {
    type: 'video/webm; codecs=H264, opus',
    extension: '.webm',
  },
  {
    type: 'video/webm; codecs=h264',
    extension: '.webm',
  },
  {
    type: 'video/webm; codecs=H264',
    extension: '.webm',
  },
  {
    type: 'video/webm; codecs="vp9, opus"',
    extension: '.webm',
  },
  {
    type: 'video/webm; codecs="vp8, opus"',
    extension: '.webm',
  },
  {
    type: 'video/webm; codecs=vp9',
    extension: '.webm',
  },
  {
    type: 'video/webm; codecs=vp8',
    extension: '.webm',
  },
  {
    type: 'video/webm; codecs=daala',
    extension: '.webm',
  },
  {
    type: 'video/webm; codecs=h264',
    extension: '.webm',
  },
  {
    type: 'video/webm;',
    extension: '.webm',
  },
  {
    type: 'video/mpeg',
    extension: '.mp4',
  },
]

export function getSupportedMimeType() {
  for (const i in mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeTypes[i].type)) {
      logger.log('[Recorder] Supported MimeType', mimeTypes[i].type)
      return mimeTypes[i]
    }
  }
  return undefined
}
