export enum AudioFormat {
    /** A full OGG container with an Opus payload */
    OGG_OPUS,
    /** A raw Opus frame from the encoder like [AudioEncoder](https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder) */
    RAW_OPUS,
    /** A full WEBM container with an Opus payload */
    WEBM,
    /** An unknown audio format */
    UNKNOWN,
}