# Media Recorder

This package is implemented to achieve:

- Recording media including video and audio

- Being able to add and remove audio tracks during record

## Library Core API

```ts
export declare function createMediaRecorder(): {
    startRecording: (stream?: MediaStream) => Promise<undefined>;
    stopRecording: () => void;
    saveRecording: (fileName?: string) => void;
    deleteAudioTrack: (track: MediaStreamTrack) => void;
    addAudioTrack: (track: MediaStreamTrack) => void;
};
```

- `createMediaRecorder`: Creates a recorder instance and returns it.

- `startRecording`: Gets an ongoing media stream and starts recording it. If no stream is provided to the function it creates and empty stream.

- `saveRecording`: Saves the recorded media in device. You can call this function during recording and it saves the recorded media until now.

- `addAudioTrack`: Gets an audio track and connects it to media recorder.

- `deleteAudioTrack`: Disconnects provided audio track from media recorder.

## Hooks

```ts
declare interface Props {
    saveDuringRecordIntervalMS?: number;
    fileNamePrefix?: string;
}

export declare function useCallRecorder(props?: Props): {
    start: () => Promise<void>;
    stop: () => void;
    save: (fileName?: string) => void;
    addAudioTrack: (audioTrack: MediaStreamTrack) => void;
    deleteAudioTrack: (audioTrack: MediaStreamTrack) => void;
    isRecording: boolean;
};
```

- `saveDuringRecordIntervalMS`: If there is a need to save recorded media periodically (for example to prevent data loss if the process has been killed), you can provide this prop and the recorded media will be saved to user's device every `saveDuringRecordIntervalMS` milliseconds. A postfix will be added to file name which indicates the recording start and end time from start of the record in seconds.(for example `[fileName].0-63.mp4`)

- `fileNamePrefix`: Will be added before file name for each `save` call.

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
