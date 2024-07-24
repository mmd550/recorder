import { saveFile } from './utils/blob.ts'
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

    supportedMimeType = getSupportedMimeType()

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
    if (!recordedBlobList.length && !blobList?.length) {
      console.error('Unable to save recording: There is no recorded data')
      return
    }

    if (!supportedMimeType) {
      console.error('Unable to save recording: There is no supported type')
      return
    }

    const fileNameWithExt = `${fileName}${supportedMimeType.extension}`
    console.log('saving chunk: ', fileNameWithExt)
    try {
      await saveFile(
        blobList || recordedBlobList,
        supportedMimeType.type,
        fileNameWithExt,
      )
    } catch (e: unknown) {
      if (e instanceof Error) console.error(e.message)
      else console.error('Unable to save recording.')
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
