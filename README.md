# opus-accumulator

**Incrementally append Opus audio chunks into a valid `.opus` file — without FFmpeg, WASM, or re-encoding.**

This library allows you to **append new Ogg/Opus files or chunks to an existing `.opus` file in an append-only way**, preserving all existing bytes. It also creates one if you don't have any.
The output file remains **valid and playable after every append**.

It is designed for **browser-based, offline-first, incremental audio recording** workflows.

## Why this exists

Recording audio in the browser, usually produces **multiple Opus chunks** (e.g. via `MediaRecorder` or WebRTC), multiple Ogg/WebM containers if not done in one session. Joining those correctly is surprisingly hard.

### The usual options are bad

#### ❌ ffmpeg.wasm

* ~33MB download
* Requires WASM support and bundler configuration
* Massive overkill for simple container-level operations
* Poor UX on mobile and offline-first apps

#### ❌ Server-side concatenation

* Requires network round-trips per chunk
* Breaks offline recording
* Couples recording reliability to network reliability
* Adds infra, latency, and failure modes

### ✅ What this library enables

A **third option**:

* ~3KB dowsload
* Pure JavaScript / TypeScript
* No dependencies
* No WASM
* No decoding or re-encoding
* Works incrementally
* Works offline
* **Supports both Ogg Opus and WebM Opus** - auto-detects container format
* Produces a valid `.opus` file at every step

## Why "accumulator"?

The term **accumulator** emphasizes that this library maintains a **growing file with persistent state**.

Unlike traditional concatenation (which processes everything at once), an accumulator:
- Grows incrementally
- Preserves previous state
- Allows resumable operations
- Works with streaming data

This matches functional programming patterns (like `Array.reduce()`) where an accumulator value is built up over multiple iterations.

## The accumulator file concept

This library revolves around the idea of an **accumulator file**.

An accumulator file is a valid `.opus` file that **grows over time**.

* New Opus chunks are appended to the end
* Existing bytes are never modified
* The file remains playable after every append

This enables a clean separation of concerns:

* **Recording** can happen independently
* **Uploading / syncing** can be a background process
* The server only ever needs to support *“append more bytes”* i.e. resume upload.

No Opus parsing or audio knowledge is required on the backend.


## Typical workflow

1. The browser records audio in Opus chunks (`.opus` or `.webm`, depending on browser)
2. Each chunk is appended to a local accumulator `.opus` file
3. The file is always valid and playable
4. A background sync uploads only the newly appended bytes
5. Uploads can be resumed by continuing to append

Recording does **not** depend on network availability.

## Performance model

This library supports a **stateful append mode**.

If you persist the accumulator state (page sequence numbers, granule position, etc.,
see `AccumulatorState` type), subsequent appends do **not** require re-reading or
re-parsing the existing output file.

Appending new chunks is proportional only to the size of the new data.

## Guarantees

This library guarantees:

* No re-encoding
* No decoding
* Append-only output
* Existing bytes of the accumulator are never modified
* Output is a valid `.opus` file after every append
* Append cost is proportional to the size of the new chunk
* No quadratic behavior for long recordings


## What this library actually does

Ogg/Opus files are not safely concatenable by naive byte appending.
Each chunk contains headers, page sequence numbers, granule positions, and checksums.

This library:

* Extracts raw Opus frames from Ogg/Opus and WebM containers
* Normalizes them into a single Ogg/Opus stream
* Removes redundant headers
* Renumbers Ogg page sequences
* Adjusts granule positions
* Clears EOS flags
* Recomputes CRCs

All without touching the encoded audio data itself.

## Installation

```sh
npm install opus-accumulator
```

## Usage

### Appending to accumulator

```ts
import { prepareAccumulator, appendToAccumulator } from "opus-accumulator";

// Load or create your initial recording
let recordingFile = await loadExistingRecording(); // Uint8Array

// Prepare it once for efficient appending
let { result, meta } = prepareAccumulator(recordingFile);
recordingFile = result; // Use the prepared version
                        // still a valid playable file

// Recording loop - append chunks as they arrive
mediaRecorder.ondataavailable = async (event) => {
  const chunk = new Uint8Array(await event.data.arrayBuffer());
  
  // Efficiently append without re-parsing the entire file
  const { result, meta: newMeta } = appendToAccumulator(recordingFile, [chunk], meta);
  
  recordingFile = result;
  meta = newMeta;
  
  // Optionally save to disk/IndexedDB
  await saveRecording(recordingFile);
};
```

The returned `accumulator` can be:

* played immediately
* saved locally
* partially uploaded
* resumed later

The server only ever receives **“append these bytes”**.
And if your back-end doesn't support a method like this,
you can still upload the entire file, of course.

### Just combine some Opus files
```ts
import { concatChunks } from "opus-accumulator";

const recordedChunks: Uint8Array[] = getRecordedChunks(); // Could be a mix of `.opus` and `.webm` audio-only files encoded with Opus codec

const result = concatChunks(recordedChunks);
```

```html
<input type="file" multiple accept=".opus,audio/ogg" id="files">
<script type="module">
  import { concatChunks } from "https://cdn.skypack.dev/opus-accumulator";

  document.getElementById("files").addEventListener("change", async e => {
    const buffers = await Promise.all(
      Array.from(e.target.files).map(f => f.arrayBuffer().then(b => new Uint8Array(b)))
    );

    const result = await concatChunks(buffers);

    const blob = new Blob([result], { type: "audio/opus" });
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    audio.controls = true;
    document.body.appendChild(audio);
  });
</script>
```

## Use cases

This library is useful if you are building:

* Browser-based voice recorders
* Offline-first PWAs
* Voice notes or messaging apps
* Interview or podcast capture tools
* Accessibility or assistive recording tools
* Field reporting or journaling apps

Especially when:

* bundle size matters
* WASM is undesirable
* network reliability cannot be assumed

## Non-goals

This library does **not**:

* Decode audio
* Encode audio
* Edit or transform audio
* Replace FFmpeg for general media processing

It solves one specific problem: **incremental, append-only Opus concatenation**.

## Cross-browser MediaRecorder support

Browsers produce Opus audio in different containers:

| Browser       | MediaRecorder output (codec/container) | Supported |
|---------------|----------------------|-----------|
| Firefox       | `.opus` (Opus/Ogg)   | ✅ |
| Chrome / Edge | `.webm` (Opus/WebM)  | ✅ |
| Safari        | `.aac` (AAC/MP4)     | ❌ |

This library accepts **both Opus formats**.
For Safari you can use other helper libraries like `opus-media-recorder` to produce Opus chunks first.

It extracts the encoded Opus frames directly from either container and appends them into a single **Ogg/Opus (`.opus`) accumulator file** — without decoding or re-encoding.
The Opus audio data is copied bit-for-bit. Only container metadata is rewritten.

## API

### `concatChunks(chunks: Uint8Array[]): Promise<Uint8Array>`

Takes an array of Opus (Ogg and WebM containers) file buffers and returns a single concatenated buffer containing a valid Ogg file with all the Opus frames inside.

**Example:**
```ts
const merged = await concatChunks([chunk1, chunk2, chunk3]);
```

---

### `prepareAccumulator(file: Uint8Array): { result: Uint8Array; meta: AccumulatorState }`

Prepares an existing Opus file for efficient incremental appending. This function:
- Clears all EOS (End of Stream) flags
- Replaces OpusTags with a minimal version (removes duration metadata)
- Returns metadata needed for `appendToAccumulator()`

**Returns:**
- `result`: The prepared file ready for appending to it. Valid playable Opus file.
- `meta`: Metadata object containing `{ serialNumber, lastPageSequence, cumulativeGranule, totalSize }`

**Example:**
```ts
const existingFile = await loadFile('recording.opus');
const { result, meta } = prepareAccumulator(existingFile);
```

---

### `appendToAccumulator(acc: Uint8Array, chunks: Uint8Array[], accMeta: AccumulatorState): { result: Uint8Array; meta: AccumulatorState }`

Efficiently appends new chunks to an accumulator file without re-parsing it.

**Parameters:**
- `acc`: The accumulator file (output from `prepareAccumulator()` or previous `appendToAccumulator()`)
- `chunks`: Array of new Opus chunks to append
- `accMeta`: Metadata from `prepareAccumulator()` or previous `appendToAccumulator()`

**Returns:**
- `result`: The new concatenated file
- `meta`: Updated metadata for the next append operation

**Example:**
```ts
let { result, meta } = appendToAccumulator(prepared, [newChunk1, newChunk2], meta);
// Keep appending more chunks
({ result, meta } = appendToAccumulator(result, [newChunk3], meta));
```

### Working with MediaRecorder chunks

MediaRecorder emits two types of data:
- **Complete files** (on `stop()`): Full containers with headers - use `concatChunks()` or `appendToAccumulator()`
- **Data chunks** (on `ondataavailable` during recording): Raw audio data without container headers

For chunks, specify the format explicitly:
```ts
import { appendToAccumulator, AudioFormat } from "opus-accumulator";

mediaRecorder.ondataavailable = async (event) => {
  const chunk = new Uint8Array(await event.data.arrayBuffer());
  
  // Specify format for chunks (browser-dependent)
  const format = isChrome ? AudioFormat.WEBM : AudioFormat.OGG_OPUS;
  
  ({ result, meta } = appendToAccumulator(result, [chunk], meta, format));
};

---

### `AccumulatorState` interface
```ts
interface AccumulatorState {
  serialNumber: number;      // Ogg stream serial number
  lastPageSequence: number;  // Last page sequence number in file
  cumulativeGranule: bigint; // Total granule position (duration in 48kHz samples)
  totalSize: number;         // Total file size in bytes
}
```

## Troubleshooting

### "No Ogg data found" error
Your input file might have metadata before the Ogg stream (ID3 tags, etc.). This library automatically skips such data, but if the error persists, the file may not be a valid Opus container.

### "Unknown audio format" error
The library supports Ogg Opus (`.opus`) and WebM Opus (`.webm`) containers. If you're getting this error:
- Check that your file is actually Opus-encoded (not AAC, MP3, etc.)
- Safari's MediaRecorder outputs AAC in MP4 - use `opus-media-recorder` polyfill first

### Debugging
Enable debug logging to see what's happening:
````ts
import { setDebug } from "opus-accumulator";
setDebug(true);
````
you can also provide your own custom logger by using `setCustomDebugLogger`
```ts
import { setCustomDebugLogger } from "opus-accumulator";
setCustomDebugLogger((...args: any) => console.debug(...args));
```


### License

[0BSD](LICENSE) — free for any project, open or closed source.  
Just keep the copyright line:  
© 2025 Chamie (https://github.com/chamie)