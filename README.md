# Media Recorder

This package is implemented to achieve:

- Recording media including video and audio

- Being able to add and remove audio tracks during record

## Library Core API

```ts
export declare function createMediaRecorder(
  timeSlice?: number,
  onDataAvailable?: (newBlob: Blob) => void,
  onComplete?: (newBlob: Blob) => void,
  saveBlobs?: boolean,
): {
  startRecording: (stream?: MediaStream) => Promise<undefined>
  stopRecording: () => void
  saveRecording: (fileName?: string, blobList?: Blob[]) => Promise<void>
  deleteAudioTrack: (track: MediaStreamTrack) => void
  addAudioTrack: (track: MediaStreamTrack) => void
  pauseRecording: () => void
  resumeRecording: () => void
}
```

- `createMediaRecorder`: Creates a recorder instance and returns it.

#### Params:

- `timeSlice`: The number of milliseconds to record into each Blob.

- `onDataAvailable`: Fired when next slice of data is available.

- `onComplete`: Fired as last `onDataAvailable` event, when recording is stopped and whole data is available.

#### Returns:

- `startRecording`: Gets an ongoing media stream and starts recording it. If no stream is provided to the function it creates and empty stream.

- `stopRecording`: Stops the recording, resets the recorder and stops all audio tracks.

- `pauseRecording | resumeRecording`: Pause and resume recording.

- `saveRecording`: Saves the recorded media in device. You can call this function during recording and it saves the recorded media until now.

- `addAudioTrack`: Gets an audio track and connects it to media recorder.

- `deleteAudioTrack`: Disconnects provided audio track from media recorder.

## Hooks

### useCallRecorder

```ts
declare interface Options {
  saveDuringRecordIntervalMS?: number
  fileNamePrefix?: string
  onWholeDataSaved?: () => void
  videoTrackConstraints?: MediaTrackConstraints
}

export declare function useCallRecorder(options?: Options): {
  start: () => Promise<undefined>
  stop: () => void
  save: (fileName?: string, blobList?: Blob[]) => Promise<void>
  addAudioTrack: (audioTrack: MediaStreamTrack) => void
  deleteAudioTrack: (audioTrack: MediaStreamTrack) => void
  isRecording: boolean
  recordingState: RecordingState
  pause: () => void
  resume: () => void
}
```

#### Params:

- `saveDuringRecordIntervalMS`: If there is a need to save recorded media periodically (for example to prevent data loss if the process has been killed), you can provide this prop and the recorded media will be saved to user's device every `saveDuringRecordIntervalMS` milliseconds. A postfix will be added to file name which indicates the recording end time from start of the record in milliseconds.(for example `[fileNamePrefix]-[fileName].8543.webm`)

- `fileNamePrefix`: Will be added before file name for each `save` call.

- `onWholeDataSaved`: Will be called when the last part of the record was saved. (It will only be called if we provide `saveDuringRecordIntervalMS` option)

- `videoTrackConstraints`: A dictionary that is used to describe a set of capabilities and the value or values each can take on.
  default value:

```ts
    {
      frameRate:
        {
            min: 25,
            max: 30
        }
    }
```

## Important Implementation Details

### 1. Adding and removing audio tracks from mediaRecorder

Adding and removing audio tracks from mediaRecorder during recording is not possible. And also we can not add multiple audio tracks to mediaRecorder. So we had to use `audioContext` api and create a single audioStream and add tracks to the context instead.

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
