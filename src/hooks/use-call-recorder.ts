import { useCallback, useEffect, useRef, useState } from 'react'
import { createMediaRecorder } from '../media-recorder.ts'
import { nothing } from '../utils/functions.ts'

interface Props {
  saveDuringRecordIntervalMS?: number
  fileNamePrefix?: string
  onWholeDataSaved?: () => void
}

export function useCallRecorder(props?: Props) {
  const {
    saveDuringRecordIntervalMS,
    fileNamePrefix,
    onWholeDataSaved = nothing,
  } = props || {}

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
    async (fileName?: string, blobList?: Blob[]) => {
      const separator =
        fileName && fileNamePrefix
          ? '-'
          : !fileName && !fileNamePrefix
            ? 'untitled'
            : ''

      if (startTimeRef.current && saveDuringRecordIntervalMS) {
        const currentTime = performance.now()
        const elapsedTimeMilliSeconds = currentTime - startTimeRef.current
        await recorderRef.current?.saveRecording(
          `${fileNamePrefix || ''}${separator}${fileName || ''}.${elapsedTimeMilliSeconds.toFixed(2)}`,
          blobList,
        )
      } else
        await recorderRef.current?.saveRecording(
          `${fileNamePrefix || ''}${separator}${fileName || ''}`,
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
    // TODO[review]: Ensure getDisplayMedia is a function. because In phone devices, it's undefined
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    })

    const recorder = createMediaRecorder(
      saveDuringRecordIntervalMS,
      saveDuringRecordIntervalMS
        ? newBlob => save(undefined, [newBlob])
        : undefined,
      saveDuringRecordIntervalMS
        ? async newBlob => {
            await save(undefined, [newBlob])
            onWholeDataSaved()
          }
        : undefined,
    )

    if (saveDuringRecordIntervalMS) startTimeRef.current = performance.now()
    await recorder.startRecording(screenStream)
    recorderRef.current = recorder
    setIsRecording(true)
  }, [save, saveDuringRecordIntervalMS, onWholeDataSaved])

  // TODO[review]: No need to define another function. Just use stop in useEffect's cleanup function.
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
