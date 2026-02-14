export type OpusFrame = {
    data: Uint8Array;
    samples: number;  // Duration in samples (48kHz)
}

export type OpusStream = {
    frames: OpusFrame[];
    serialNumber?: number;
    channels: number;
    preskip: number;
    sampleRate: number;
}