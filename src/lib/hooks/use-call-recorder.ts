import { useCallback, useEffect, useRef, useState } from 'react'
import { createMediaRecorder } from '../media-recorder.ts'

interface Props {
  saveDuringRecordIntervalMS?: number
  fileNamePrefix?: string
}

export function useCallRecorder(props?: Props) {
  const { saveDuringRecordIntervalMS, fileNamePrefix } = props || {}

  const recorderRef = useRef<ReturnType<typeof createMediaRecorder>>()
  const [isRecording, setIsRecording] = useState(false)
  const downloadInterval = useRef<NodeJS.Timeout>()
  const startTimeRef = useRef<number>()

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder) return
    recorder.stopRecording()
    setIsRecording(false)
    if (downloadInterval.current) clearInterval(downloadInterval.current)
  }, [])

  const save = useCallback(
    (fileName?: string) => {
      if (startTimeRef.current && saveDuringRecordIntervalMS) {
        const currentTime = performance.now()
        const elapsedTimeSeconds = (currentTime - startTimeRef.current) / 1000
        recorderRef.current?.saveRecording(
          `${fileNamePrefix || ''}-${fileName || ''}.0-${elapsedTimeSeconds.toFixed()}`,
        )
      } else
        recorderRef.current?.saveRecording(
          `${fileNamePrefix || ''}${fileName || ''}`,
        )
    },
    [fileNamePrefix, saveDuringRecordIntervalMS],
  )

  const addAudioTrack = useCallback((audioTrack: MediaStreamTrack) => {
    recorderRef.current?.addAudioTrack(audioTrack)
  }, [])

  const deleteAudioTrack = useCallback((audioTrack: MediaStreamTrack) => {
    recorderRef.current?.deleteAudioTrack(audioTrack)
  }, [])

  const start = useCallback(async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    })
    const recorder = createMediaRecorder()

    recorder.startRecording(screenStream)
    recorderRef.current = recorder
    setIsRecording(true)

    if (saveDuringRecordIntervalMS) {
      startTimeRef.current = performance.now()
      downloadInterval.current = setInterval(() => {
        if (!startTimeRef.current) return
        save()
      }, saveDuringRecordIntervalMS)
    }
  }, [save, saveDuringRecordIntervalMS])

  const cleanup = () => {
    if (downloadInterval.current) {
      clearInterval(downloadInterval.current)
    }
    stop()
  }

  useEffect(
    () => cleanup,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return {
    start,
    stop,
    save,
    addAudioTrack,
    deleteAudioTrack,
    isRecording,
  }
}
