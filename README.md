# Media Recorder

This package is implemented to achieve:

- Recording media including video and audio

- Being able to add and remove audio tracks during record

## Library Core API

```ts
export declare function createMediaRecorder(): {
  startRecording: (stream?: MediaStream) => Promise<undefined>
  stopRecording: () => void
  downloadRecording: (fileName?: string) => void
  deleteAudioTrack: (track: MediaStreamTrack) => void
  addAudioTrack: (track: MediaStreamTrack) => void
}
```

- createMediaRecorder: Creates a recorder instance and returns it.

- startRecording: Gets an ongoing media stream and starts recording it. If no stream is provided to the function it creates and empty stream.

- downloadRecording: Downloads the recorded media. You can call this function during recording and it saves the recorded media until now.

- addAudioTrack: Gets an audio track and connects it to media recorder.

- deleteAudioTrack: Disconnects provided audio track from media recorder.

## Hooks

```ts
export declare function useCallRecorder(): {
  start: () => Promise<void>
  stop: () => void
  download: (fileName?: string) => void
  addAudioTrack: (audioTrack: MediaStreamTrack) => void
  deleteAudioTrack: (audioTrack: MediaStreamTrack) => void
  isRecording: boolean
}
```

## Important Implementation Details

### 1. Adding and removing audio tracks from mediaRecorder

Adding and removing audio tracks from mediaRecorder during recording is not possible. And also we can not add multiple audio tracks to mediaRecorder. So I we had to use audioContext api and create a single audioStream and add tracks to the context instead.

Create audio track with audio context and add it to recording stream:

```ts
//  Global variables
const audioContext = new AudioContext()
const audioDestination = audioContext.createMediaStreamDestination()
let mediaRecorder

//  Create main audio stream and add to media recorder
const audioTrack = audioDestination.stream.getAudioTracks()[0]
const resultStream = new MediaStream()
resultStream.addTrack(audioTrack)
mediaRecorder = new MediaRecorder(targetStream, options)
```

Add new tracks to audio stream:

```ts
function addTrack(track: MediaStreamTrack) {
  const audioStream = new MediaStream()
  audioStream.addTrack(track)

  const sourceNode = audioContext.createMediaStreamSource(audioStream)
  sourceNode.connect(audioDestination)
}
```
