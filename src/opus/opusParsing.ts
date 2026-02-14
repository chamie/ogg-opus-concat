export const getOpusSamples = (opusPacket: Uint8Array): number => {
    const toc = opusPacket[0];
    const config = (toc >> 3) & 0x1F;

    // Frame sizes based on config (simplified)
    const frameSizes = [
        480, 960, 1920, 2880,  // SILK-only (NB)
        480, 960, 1920, 2880,  // SILK-only (MB)
        480, 960, 1920, 2880,  // SILK-only (WB)
        480, 960, 1920, 2880,  // Hybrid (SWB)
        480, 960, 1920, 2880,  // Hybrid (FB)
        120, 240, 480, 960,    // CELT-only (NB)
        120, 240, 480, 960,    // CELT-only (WB)
        120, 240, 480, 960,    // CELT-only (SWB)
        120, 240, 480, 960,    // CELT-only (FB)
    ];

    return frameSizes[config] || 960; // Fallback to 20ms
};