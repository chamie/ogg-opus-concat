export const getOpusSamples = (opusPacket: Uint8Array): number => {
    const toc = opusPacket[0];
    const config = (toc >> 3) & 0x1F;
    const c = toc & 0x03; // Frame count code

    // Frame sizes in samples (48kHz) based on config number (RFC 6716 Table 2)
    const frameSizes = [
        480, 960, 1920, 2880,  // 0-3:   SILK-only NB (10/20/40/60ms)
        480, 960, 1920, 2880,  // 4-7:   SILK-only MB
        480, 960, 1920, 2880,  // 8-11:  SILK-only WB
        480, 960,               // 12-13: Hybrid SWB (10/20ms)
        480, 960,               // 14-15: Hybrid FB (10/20ms)
        120, 240, 480, 960,    // 16-19: CELT-only NB (2.5/5/10/20ms)
        120, 240, 480, 960,    // 20-23: CELT-only WB
        120, 240, 480, 960,    // 24-27: CELT-only SWB
        120, 240, 480, 960,    // 28-31: CELT-only FB
    ];

    const samplesPerFrame = frameSizes[config] || 960;

    // Determine number of frames per packet from code bits
    let frameCount: number;
    switch (c) {
        case 0: frameCount = 1; break;
        case 1: frameCount = 2; break;
        case 2: frameCount = 2; break;
        case 3: frameCount = opusPacket.length >= 2 ? opusPacket[1] & 0x3F : 1; break;
        default: frameCount = 1;
    }

    return samplesPerFrame * frameCount;
};