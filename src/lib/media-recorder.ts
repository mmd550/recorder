export function createMediaRecorder() {
  // Audio Part
  const sourceNodeMap = new Map<string, MediaStreamAudioSourceNode>()
  let audioContext: AudioContext | null
  let audioDestination: MediaStreamAudioDestinationNode | null
  let mutedSourceNode: AudioBufferSourceNode | null

  // Recording Part
  let targetStream: MediaStream | null
  let recordedBlobList: Blob[]
  let mediaRecorder: MediaRecorder | null
  let isRecording = false
  let supportedType: string | undefined

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

  async function startRecording(stream: MediaStream) {
    const mimeTypes = [
      'video/webm; codecs="vp9, opus"',
      'video/webm; codecs="vp8, opus"',
      'video/webm; codecs=vp9',
      'video/webm; codecs=vp8',
      'video/webm; codecs=daala',
      'video/webm; codecs=h264',
      'video/webm;',
      'video/mpeg',
    ]
    supportedType = undefined

    for (const i in mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeTypes[i])) {
        supportedType = mimeTypes[i]
        break
      }
    }

    if (!supportedType) {
      return Promise.reject('No supported type found for MediaRecorder')
    }

    const options = {
      mimeType: supportedType,
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
    mediaRecorder.start(100)
    isRecording = true
  }

  function handleDataAvailable(event: BlobEvent) {
    if (event.data && event.data.size > 0) {
      recordedBlobList.push(event.data)
    }
  }

  function handleStop() {
    isRecording = false

    resetVideoProcess()
    resetAudioProcess()

    // reset recording part
    targetStream?.getTracks().forEach(track => track.stop())
    targetStream = null
    mediaRecorder = null
  }

  async function createTargetStream(stream: MediaStream) {
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

    mediaRecorder?.stop()
  }

  function downloadRecording(fileName?: string) {
    if (!recordedBlobList.length) {
      console.error('There is no recorded data')
      return
    }

    if (!('URL' in window)) {
      console.error('browser not supported')
      return
    }

    if (!supportedType) {
      console.error('There is no supported type')
      return
    }

    const name = `${fileName}.webm` || 'test.webm'
    const blob = new Blob(recordedBlobList, { type: supportedType })
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
    downloadRecording,
    deleteAudioTrack,
    addAudioTrack,
  }
}
