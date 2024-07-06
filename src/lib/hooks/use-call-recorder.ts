import { useCallback, useRef, useState } from 'react'
import { createMediaRecorder } from '../media-recorder.ts'

export function useCallRecorder() {
  const recorderRef = useRef<ReturnType<typeof createMediaRecorder>>()
  const [isRecording, setIsRecording] = useState(false)

  const start = useCallback(async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    })
    const recorder = createMediaRecorder()

    recorder.startRecording(screenStream)
    recorderRef.current = recorder
    setIsRecording(true)
  }, [])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder) return
    recorder.stopRecording()
    setIsRecording(false)
  }, [])

  const download = useCallback((fileName?: string) => {
    recorderRef.current?.downloadRecording(fileName)
  }, [])

  const addAudioTrack = useCallback((audioTrack: MediaStreamTrack) => {
    recorderRef.current?.addAudioTrack(audioTrack)
  }, [])

  const deleteAudioTrack = useCallback((audioTrack: MediaStreamTrack) => {
    recorderRef.current?.deleteAudioTrack(audioTrack)
  }, [])

  return {
    start,
    stop,
    download,
    addAudioTrack,
    deleteAudioTrack,
    isRecording,
  }
}
