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
  const startTimeRef = useRef<number>()

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder) return
    recorder.stopRecording()
    setIsRecording(false)
  }, [])

  const save = useCallback(
    (fileName?: string, blobList?: Blob[]) => {
      if (startTimeRef.current && saveDuringRecordIntervalMS) {
        const currentTime = performance.now()
        const elapsedTimeSeconds = currentTime - startTimeRef.current
        recorderRef.current?.saveRecording(
          `${fileNamePrefix || ''}-${fileName || ''}.${elapsedTimeSeconds}`,
          blobList,
        )
      } else
        recorderRef.current?.saveRecording(
          `${fileNamePrefix || ''}${fileName || ''}`,
          blobList,
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
    const recorder = createMediaRecorder(
      saveDuringRecordIntervalMS,
      saveDuringRecordIntervalMS
        ? newBlob => save(undefined, [newBlob])
        : undefined,
      newBlob => save(undefined, [newBlob]),
    )

    if (saveDuringRecordIntervalMS) startTimeRef.current = performance.now()
    recorder.startRecording(screenStream)
    recorderRef.current = recorder
    setIsRecording(true)
  }, [save, saveDuringRecordIntervalMS])

  const cleanup = () => {
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
