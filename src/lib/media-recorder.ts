interface MimeType {
  type: string
  extension: string
}

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
 * @param onComplete - Fired when recording is stopped and whole data is available
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
      if (sourceNodeMap.has(trackID)) {
        return
      }

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
      console.error('Invalid arugment')
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

    for (const i in mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeTypes[i].type)) {
        supportedMimeType = mimeTypes[i]
        break
      }
    }

    if (!supportedMimeType) {
      return Promise.reject('No supported type found for MediaRecorder')
    }

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
      console.log('DATA_AVAILABLE')
      recordedBlobList.push(event.data)
      if (!isRecording) onComplete(event.data)
      onDataAvailable(event.data)
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
    stream = stream || new MediaStream()

    if (!(stream instanceof MediaStream)) {
      return Promise.reject(new Error('Invalid arugment'))
    }

    /*let videoTrack;
    try {
      videoTrack = await processVideoTrack(stream);
    } catch (error) {
      return Promise.reject(error);
    }*/

    const videoTrack = stream.getVideoTracks()[0]
    const audioTrack = processAudioTrack(stream)

    const resultStream = new MediaStream()
    resultStream.addTrack(videoTrack)
    resultStream.addTrack(audioTrack)

    return Promise.resolve(resultStream)
  }

  function processAudioTrack(stream: MediaStream) {
    audioContext = new AudioContext()
    audioDestination = audioContext.createMediaStreamDestination()

    // default AudioSourceNode
    mutedSourceNode = audioContext.createBufferSource()
    mutedSourceNode.connect(audioDestination)

    stream
      .getTracks()
      .filter(track => {
        return track.kind === 'audio'
      })
      .forEach(function (track) {
        if (!audioContext || !audioDestination) return

        const trackID = track.id
        if (sourceNodeMap.has(trackID)) {
          return
        }

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
      console.error('Recording is not in progress')
      return
    }
    isRecording = false
    mediaRecorder?.stop()
  }

  function saveRecording(fileName?: string, blobList?: Blob[]) {
    if (!recordedBlobList.length) {
      console.error('There is no recorded data')
      return
    }

    if (!('URL' in window)) {
      console.error('browser not supported')
      return
    }

    if (!supportedMimeType) {
      console.error('There is no supported type')
      return
    }

    const name = fileName
      ? `${fileName}${supportedMimeType.extension}`
      : `video${supportedMimeType.extension}`
    const blob = new Blob(blobList || recordedBlobList, {
      type: supportedMimeType.type,
    })
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      if ('URL' in window) {
        window.URL.revokeObjectURL(url)
      }
      document.body.removeChild(a)
    }, 100)
  }

  function resetVideoProcess() {}

  function resetAudioProcess() {
    // reset sequence?
    sourceNodeMap.forEach(sourceNode => {
      sourceNode.disconnect()
    })
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
      audioContext.close()
      audioContext = null
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
