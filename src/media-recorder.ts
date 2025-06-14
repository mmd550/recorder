import { saveFile } from './utils/blob.ts'
import { logger } from './utils/logger.ts'
import { getSupportedMimeType, MimeType } from './utils/supported-mime-type.ts'

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
  saveBlobs = true,
  /**
   * A dictionary that is used to describe a set of capabilities and the value or values each can take on.
   */
  videoTrackConstraints?: MediaTrackConstraints,
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
      logger.error('Recording is not in progress')
      return
    }

    if (!(track instanceof MediaStreamTrack)) {
      logger.error('Invalid arugment')
      return
    }

    if (!audioContext) {
      logger.error('no audio context')
      return
    }

    if (!audioDestination) {
      logger.error('no audioDestination')
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
      logger.error('Recording is not in progress')
      return
    }

    if (!(track instanceof MediaStreamTrack)) {
      logger.error('Invalid argument')
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

    supportedMimeType = getSupportedMimeType()

    if (!supportedMimeType)
      return Promise.reject('No supported type found for MediaRecorder')

    const options = {
      mimeType: supportedMimeType.type,
    }

    try {
      targetStream = await createTargetStream(stream)
    } catch (error) {
      logger.error(error)
      return Promise.reject('TargetStream Error')
    }

    recordedBlobList = []
    try {
      mediaRecorder = new MediaRecorder(targetStream, options)
    } catch (error) {
      logger.error(error)
      return Promise.reject('MediaRecorder Error')
    }

    mediaRecorder.addEventListener('stop', handleStop)
    mediaRecorder.addEventListener('dataavailable', handleDataAvailable)
    mediaRecorder.start(timeSlice)
    isRecording = true
  }

  function handleDataAvailable(event: BlobEvent) {
    if (event.data && event.data.size > 0) {
      if (saveBlobs) recordedBlobList.push(event.data)

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

    videoTrack?.applyConstraints(videoTrackConstraints)

    const resultStream = new MediaStream()
    videoTrack && resultStream.addTrack(videoTrack)
    resultStream.addTrack(audioTrack)

    return resultStream
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

  function pauseRecording() {
    if (mediaRecorder?.state === 'paused') {
      logger.error('Unable to pause recording: Recording is already paused')
      return
    }

    mediaRecorder?.pause()
  }

  function resumeRecording() {
    if (mediaRecorder?.state !== 'paused') {
      logger.error(
        'Unable to resume recording: Recording is already in progress',
      )
      return
    }

    mediaRecorder?.resume()
  }

  function stopRecording() {
    if (!isRecording) {
      logger.error('Unable to stop recording: Recording is not in progress')
      return
    }

    isRecording = false
    mediaRecorder?.stop()
  }

  async function saveRecording(
    fileName = 'untitled_recording',
    blobList?: Blob[],
  ) {
    if (!recordedBlobList.length && !blobList?.length) {
      logger.error('Unable to save recording: There is no recorded data')
      return
    }

    if (!supportedMimeType) {
      logger.error('Unable to save recording: There is no supported type')
      return
    }

    const fileNameWithExt = `${fileName}${supportedMimeType.extension}`
    logger.log('[Recorder] saving chunk: ', fileNameWithExt)
    try {
      await saveFile(
        blobList || recordedBlobList,
        supportedMimeType.type,
        fileNameWithExt,
      )
    } catch (e: unknown) {
      if (e instanceof Error) logger.error(e.message)
      else logger.error('Unable to save recording.')
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
    pauseRecording,
    resumeRecording,
  }
}
