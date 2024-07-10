import { saveFile } from './utils/blob.ts'

interface MimeType {
  type: string
  extension: string
}

//  If we use mp4 mimetypes, saving multiple chunks and merging them together won't be possible.
//  saving mp4 mimetypes is supported in safari but generated file is corrupted.

const mimeTypes: MimeType[] = [
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

/**
 *
 * @param timeSlice – The number of milliseconds to record into each Blob.
 * @param onDataAvailable - Fired when next slice of data is available.
 * @param onComplete - Fired as last 'onDataAvailable' event, when recording is stopped and whole data is available
 */
export function createMediaRecorder(
  timeSlice = 2000,
  onDataAvailable: (newBlob: Blob) => void = () => {},
  onComplete: (newBlob: Blob) => void = () => {},
) {
  const sourceNodeMap = new Map<string, MediaStreamAudioSourceNode>()
  let audioContext: AudioContext | null
  let audioDestination: MediaStreamAudioDestinationNode | null
  let mutedSourceNode: AudioBufferSourceNode | null

  let targetStream: MediaStream | null
  let recordedBlobList: Blob[]
  let mediaRecorder: MediaRecorder | null
  let isRecording = false
  let supportedMimeType: MimeType | undefined

  function addAudioTrack(track: MediaStreamTrack) {
    if (!isRecording) {
      console.error('Recording is not in progress')
      return
    }

    if (!(track instanceof MediaStreamTrack)) {
      console.error('Invalid arugment')
      return
    }

    if (!audioContext) {
      console.error('no audio context')
      return
    }

    if (!audioDestination) {
      console.error('no audioDestination')
      return
    }

    if (track.kind === 'audio') {
      const trackID = track.id
      if (sourceNodeMap.has(trackID)) return

      const audioStream = new MediaStream()
      audioStream.addTrack(track)

      const sourceNode = audioContext.createMediaStreamSource(audioStream)
      sourceNode.connect(audioDestination)
      sourceNodeMap.set(trackID, sourceNode)
    }
  }

  function deleteAudioTrack(track: MediaStreamTrack) {
    if (!isRecording) {
      console.error('Recording is not in progress')
      return
    }

    if (!(track instanceof MediaStreamTrack)) {
      console.error('Invalid argument')
      return
    }

    if (track.kind === 'audio') {
      const trackID = track.id
      const sourceNode = sourceNodeMap.get(trackID)

      if (sourceNode) {
        sourceNode.disconnect()
        sourceNodeMap.delete(trackID)
      }
    }
  }

  async function startRecording(stream?: MediaStream) {
    supportedMimeType = undefined

    // TODO[review]: You can move mimeTypes list and this logic (detecting supported mimeType) to utils
    for (const i in mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeTypes[i].type)) {
        supportedMimeType = mimeTypes[i]
        break
      }
    }

    if (!supportedMimeType)
      return Promise.reject('No supported type found for MediaRecorder')

    const options = {
      mimeType: supportedMimeType.type,
    }

    try {
      targetStream = await createTargetStream(stream)
    } catch (error) {
      console.error(error)
      return Promise.reject('TargetStream Error')
    }

    recordedBlobList = []
    try {
      mediaRecorder = new MediaRecorder(targetStream, options)
    } catch (error) {
      console.error(error)
      return Promise.reject('MediaRecorder Error')
    }

    mediaRecorder.addEventListener('stop', handleStop)
    mediaRecorder.addEventListener('dataavailable', handleDataAvailable)
    mediaRecorder.start(timeSlice)
    isRecording = true
  }

  function handleDataAvailable(event: BlobEvent) {
    if (event.data && event.data.size > 0) {
      recordedBlobList.push(event.data)

      if (!isRecording) onComplete(event.data)
      else onDataAvailable(event.data)
    }
  }

  function handleStop() {
    resetVideoProcess()
    resetAudioProcess()

    // reset recording part
    targetStream?.getTracks().forEach(track => track.stop())
    targetStream = null
    mediaRecorder = null
  }

  async function createTargetStream(stream?: MediaStream) {
    if (stream && !(stream instanceof MediaStream)) {
      return Promise.reject(new Error('Invalid arugment'))
    }

    /*let videoTrack;
    try {
      videoTrack = await processVideoTrack(stream);
    } catch (error) {
      return Promise.reject(error);
    }*/

    const videoTrack = stream?.getVideoTracks()[0]
    const audioTrack = processAudioTrack(stream)

    const resultStream = new MediaStream()
    videoTrack && resultStream.addTrack(videoTrack)
    resultStream.addTrack(audioTrack)

    // TODO[review]: No need to return Promise.resolve; Returning resultStream does the job since the function is async.
    return Promise.resolve(resultStream)
  }

  function processAudioTrack(stream?: MediaStream) {
    audioContext = new AudioContext()
    audioDestination = audioContext.createMediaStreamDestination()

    // default AudioSourceNode
    mutedSourceNode = audioContext.createBufferSource()
    mutedSourceNode.connect(audioDestination)

    //  Add stream audio tracks (if exists) to audio context
    stream
      ?.getTracks()
      .filter(track => track.kind === 'audio')
      .forEach(function (track) {
        if (!audioContext || !audioDestination) return

        const trackID = track.id
        if (sourceNodeMap.has(trackID)) return

        const audioStream = new MediaStream()
        audioStream.addTrack(track)

        const sourceNode = audioContext.createMediaStreamSource(audioStream)
        sourceNode.connect(audioDestination)
        sourceNodeMap.set(trackID, sourceNode)
      })

    return audioDestination.stream.getAudioTracks()[0]
  }

  function stopRecording() {
    if (!isRecording) {
      console.error('Unable to stop recording: Recording is not in progress')
      return
    }

    isRecording = false
    mediaRecorder?.stop()
  }

  async function saveRecording(
    fileName = 'untitled_recording',
    blobList?: Blob[],
  ) {
    if (!recordedBlobList.length) {
      console.error('Unable to save recording: There is no recorded data')
      return
    }

    if (!supportedMimeType) {
      console.error('Unable to save recording: There is no supported type')
      return
    }

    const fileNameWithExt = `${fileName}${supportedMimeType.extension}`
    try {
      await saveFile(
        blobList || recordedBlobList,
        supportedMimeType.type,
        fileNameWithExt,
      )
    } catch (e) {
      console.error('Unable to save recording: Browser not supported')
    }
  }

  function resetVideoProcess() {}

  function resetAudioProcess() {
    // reset sequence?
    sourceNodeMap.forEach(sourceNode => sourceNode.disconnect())
    sourceNodeMap.clear()

    if (mutedSourceNode) {
      mutedSourceNode.disconnect()
      mutedSourceNode = null
    }

    if (audioDestination) {
      audioDestination.disconnect()
      audioDestination = null
    }

    if (audioContext) {
      audioContext.close().then(() => {
        audioContext = null
      })
    }
  }

  return {
    startRecording,
    stopRecording,
    saveRecording,
    deleteAudioTrack,
    addAudioTrack,
  }
}
