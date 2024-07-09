import { useCallback, useRef, useState } from 'react'
import './App.css'
import { useCallRecorder } from '../lib/hooks/use-call-recorder.ts'

let firstAudioStream: MediaStream | null
let secondAudioStream: MediaStream | null
let micAudioStream: MediaStream | null

interface HTMLMediaElementWithCaptureStream extends HTMLMediaElement {
  captureStream(): MediaStream
}

type AudioState = 'off' | 'on'

function App() {
  const firstAudioRef = useRef<HTMLAudioElement>(null)
  const secondAudioRef = useRef<HTMLAudioElement>(null)

  const { start, stop, isRecording, deleteAudioTrack, addAudioTrack, save } =
    useCallRecorder({
      saveDuringRecordIntervalMS: 5000,
      fileNamePrefix: 'prefix',
    })

  const handleStart = () => {
    setInterval(() => {
      const a = document.getElementById('link')
      a.click()
    }, 4000)
  }

  const [audioState, setAudioState] = useState<{
    audio1: AudioState
    audio2: AudioState
    mic: AudioState
  }>({
    audio1: 'off',
    audio2: 'off',
    mic: 'off',
  })

  const toggleFirstAudio = useCallback(() => {
    const audio = firstAudioRef.current
    if (!audio) return

    if (audioState.audio1 === 'off') {
      audio?.play()
      if (!firstAudioStream) {
        firstAudioStream = (
          audio as HTMLMediaElementWithCaptureStream
        ).captureStream()
      }
      addAudioTrack(firstAudioStream.getAudioTracks()[0])
      setAudioState(state => ({ ...state, audio1: 'on' }))
    } else if (audioState.audio1 === 'on') {
      audio.pause()
      if (firstAudioStream) {
        deleteAudioTrack(firstAudioStream.getAudioTracks()[0])
      }
      setAudioState(state => ({ ...state, audio1: 'off' }))
    }
  }, [audioState, addAudioTrack, deleteAudioTrack])

  const toggleSecondAudio = useCallback(() => {
    const audio = secondAudioRef.current
    if (!audio) return

    if (audioState.audio2 === 'off') {
      audio?.play()
      if (!secondAudioStream) {
        secondAudioStream = (
          audio as HTMLMediaElementWithCaptureStream
        ).captureStream()
      }
      addAudioTrack(secondAudioStream.getAudioTracks()[0])
      setAudioState(state => ({ ...state, audio2: 'on' }))
    } else {
      audio.pause()
      if (secondAudioStream) {
        deleteAudioTrack(secondAudioStream.getAudioTracks()[0])
      }
      setAudioState(state => ({ ...state, audio2: 'off' }))
    }
  }, [audioState, addAudioTrack, deleteAudioTrack])

  const toggleMicAudio = useCallback(async () => {
    if (audioState.mic === 'off') {
      if (!micAudioStream) {
        micAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        })
      }
      addAudioTrack(micAudioStream.getAudioTracks()[0])
      setAudioState(state => ({ ...state, mic: 'on' }))
    } else if (audioState.mic === 'on') {
      if (micAudioStream) {
        deleteAudioTrack(micAudioStream.getAudioTracks()[0])
      }
      setAudioState(state => ({ ...state, mic: 'off' }))
    }
  }, [audioState, addAudioTrack, deleteAudioTrack])

  const reset = useCallback(() => {
    firstAudioRef.current?.pause()
    secondAudioRef.current?.pause()
    setAudioState({ mic: 'off', audio1: 'off', audio2: 'off' })

    micAudioStream = null
    firstAudioStream = null
    secondAudioStream = null
  }, [])

  const stopRecording = useCallback(() => {
    stop()
    reset()
  }, [reset, stop])

  return (
    <>
      <button onClick={start}>Start Recording</button>
      <button disabled={!isRecording} onClick={toggleFirstAudio}>
        Audio #1 {audioState.audio1}
      </button>
      <button disabled={!isRecording} onClick={toggleSecondAudio}>
        Audio #2 {audioState.audio2}
      </button>
      <button disabled={!isRecording} onClick={toggleMicAudio}>
        MIC {audioState.mic}
      </button>
      <button onClick={stopRecording}>Stop Recording</button>
      <button onClick={() => save()}>Download Recording</button>

      <audio ref={firstAudioRef} src="/audio/StarWars60.wav"></audio>

      <audio ref={secondAudioRef} src="/audio/PinkPanther60.wav"></audio>

      <a href="/audio/StarWars60.wav" id="link" download="test.wav"></a>
    </>
  )
}

export default App
