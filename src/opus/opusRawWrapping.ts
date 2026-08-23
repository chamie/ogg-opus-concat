import { OpusStream } from "../types/opus";
import { getOpusSamples } from "./opusParsing"

export const wrapRawOpusFrame = (data: Uint8Array): OpusStream =>
({
    frames: [{
        data,
        samples: getOpusSamples(data),
    }],
    // The following metadata is not available from a raw Opus frame, so we provide defaults
    // which is irrelevant because raw Opus frames are only used for appending to an existing stream,
    // and the metadata will be taken from the existing stream.
    channels: 1, // Standard mono default
    preskip: 0,
    sampleRate: 48000, // Opus internal clock rate is always 48kHz
});