import { useCallback, useEffect, useRef, useState } from 'react'
import { createMediaRecorder } from '../media-recorder.ts'
import { nothing } from '../utils/functions.ts'

interface Options {
  /**
   * If there is a need to save recorded media periodically (for example to prevent data loss if the process has been killed), you can provide this prop and the recorded media will be saved to user's device every `saveDuringRecordIntervalMS` milliseconds. A postfix will be added to file name which indicates the recording end time from start of the record in milliseconds.(for example `[fileNamePrefix]-[fileName].8543.webm`)
   */
  saveDuringRecordIntervalMS?: number
  /**
   * Will be added before file name for each `save` call
   */
  fileNamePrefix?: string
  /**
   * Will be called when the last part of the record was saved. (It will only be called if we provide `saveDuringRecordIntervalMS` option)
   */
  onWholeDataSaved?: () => void
  /**
   * A dictionary that is used to describe a set of capabilities and the value or values each can take on.
   * @default
   *  {
   *    frameRate: {
   *      min: 25,
   *      max: 30
   *    }
   *  }
   */
  videoTrackConstraints?: MediaTrackConstraints
}

export function useCallRecorder(options?: Options) {
  const {
    saveDuringRecordIntervalMS,
    fileNamePrefix,
    onWholeDataSaved = nothing,
    videoTrackConstraints = {
      frameRate: { min: 25, max: 30 },
    },
  } = options || {}

  const recorderRef = useRef<ReturnType<typeof createMediaRecorder>>()
  const [recordingState, setRecordingState] =
    useState<RecordingState>('inactive')
  const startTimeRef = useRef<number>()

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder) return

    recorder.stopRecording()
    setRecordingState('inactive')
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
    const supportedConstraints =
      navigator.mediaDevices.getSupportedConstraints()
    const passedConstraints = videoTrackConstraints

    console.log(
      'Starting Record',
      JSON.stringify({ passedConstraints, supportedConstraints }),
    )

    if (recordingState === 'recording') return
    if (typeof navigator.mediaDevices?.getDisplayMedia !== 'function')
      return Promise.reject(
        new Error(
          'Could not start recording. Browser does not support getDisplayMedia.',
        ),
      )

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
      !saveDuringRecordIntervalMS,
      videoTrackConstraints,
    )

    if (saveDuringRecordIntervalMS) startTimeRef.current = performance.now()
    await recorder.startRecording(screenStream)
    recorderRef.current = recorder
    setRecordingState('recording')
  }, [
    save,
    saveDuringRecordIntervalMS,
    onWholeDataSaved,
    recordingState,
    videoTrackConstraints,
  ])

  const pause = useCallback(() => {
    recorderRef.current?.pauseRecording()
    setRecordingState('paused')
  }, [])

  const resume = useCallback(() => {
    recorderRef.current?.resumeRecording()
    setRecordingState('recording')
  }, [])

  useEffect(
    () => stop,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return {
    start,
    /**
     * Stops the recording. If `saveDuringRecordIntervalMS` option is provided, after calling stop, the last chunk will be saved and then the `onWholeDataSaved` callback will be called to make sure the whole data has been saved before terminating the process.
     */
    stop,
    save,
    addAudioTrack,
    deleteAudioTrack,
    isRecording: recordingState !== 'inactive',
    recordingState,
    pause,
    resume,
  }
}
