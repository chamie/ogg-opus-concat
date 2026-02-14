import debug from "../common/debugger";
import { LACING_TYPES } from "./EBMLTypes";

const debugLog = (...args: any[]) => debug.debugLog('parser', ...args);

/**
 * Read EBML variable-length integer (VINT)
 * First byte encodes both the length and part of the value
 */
export const readVINT = (data: Uint8Array, offset: number, isId = false): { value: bigint, size: number, isUnknown: boolean } => {
    let firstByte = data[offset];

    // 1. Determine width
    const width = Math.clz32(firstByte) - 24 + 1; // Number of leading zero bits + 1

    if (width < 1) {
        throw new Error("Invalid EBML VINT width");
    }

    // 2. Clear the marker bit if not an ID
    if (!isId) {
        const markerBit = 1 << (8 - width);
        firstByte &= ~markerBit;
    }

    let value = BigInt(firstByte);

    // 3. Append subsequent bytes
    for (let i = 1; i < width; i++) {
        value = (value << BigInt(8)) | BigInt(data[offset + i]);
    }

    // 4. Check for "All 1s" (Unknown Length)
    const maxValue = (BigInt(1) << BigInt(width * 7)) - BigInt(1);
    const isUnknown = value === maxValue

    debugLog(`Read VINT at offset ${offset}: value=${value}, size=${width}, isUnknown=${isUnknown}, bytes=[\n${Array.from(data.subarray(offset, offset + width)).map(b => b.toString(16).padStart(2, '0')).join(' ')}\n]`);

    return {
        value,
        size: width,
        isUnknown,
    };
};

export const readId = (data: Uint8Array, offset: number) =>
    readVINT(data, offset, true);

export const decodeString = (data: Uint8Array, offset: number, length: number): string =>
    new TextDecoder("utf-8").decode(data.subarray(offset, offset + length))
        .replace(/\0/g, ''); // EBML strings are sometimes null-terminated (0x00) inside the buffer.

const decodeSignedVint = (value: bigint, width: number): bigint => {
    // This is essentially calculating half the max value for the given width
    const range = (BigInt(1) << BigInt(7 * width - 1)) - BigInt(1);
    return value - range;
};

export const processSimpleBlock = (data: Uint8Array, lacingType: number): Uint8Array[] => {
    if (lacingType === LACING_TYPES.NONE) {
        debugLog(`SimpleBlock with no lacing, single frame of size ${data.length} bytes`);
        return [data];
    }
    const numFrames = data[0] + 1;
    let offset = 1;
    const frameSizes: number[] = [];

    if (lacingType === LACING_TYPES.FIXED_SIZE) {
        const totalSize = data.length - 1;
        const frameSize = Math.floor(totalSize / numFrames);
        for (let i = 0; i < numFrames; i++) {
            frameSizes.push(frameSize);
        }
    } else {
        switch (lacingType) {
            case LACING_TYPES.XIPH:
                for (let i = 0; i < numFrames - 1; i++) {
                    let size = 0;
                    let byte = 255;
                    while (byte === 255) {
                        byte = data[offset++];
                        size += byte;
                    }
                    frameSizes.push(size);
                }
                break;
            case LACING_TYPES.EBML:
                // First size is absolute
                let { value: firstSize, size: firstSizeLen } = readVINT(data, offset);
                offset += firstSizeLen;
                frameSizes.push(Number(firstSize));

                // Subsequent sizes are signed differences
                let previousSize = firstSize;
                for (let i = 1; i < numFrames - 1; i++) {
                    let { value: sizeDiffRaw, size: sizeDiffLen } = readVINT(data, offset);
                    offset += sizeDiffLen;
                    // Convert from "EBML signed integer" to normal signed integer
                    const sizeDiff = BigInt(decodeSignedVint(sizeDiffRaw, sizeDiffLen));
                    const frameSize = previousSize + sizeDiff;
                    frameSizes.push(Number(frameSize));
                    previousSize = frameSize;
                }
                break;
        }
        // Last frame size is whatever remains
        const totalKnownSizes = frameSizes.reduce((a, b) => a + b, 0);
        const lastFrameSize = data.length - offset - totalKnownSizes;
        frameSizes.push(lastFrameSize);
    }
    const frames: Uint8Array[] = [];
    for (const frameSize of frameSizes) {
        const frameData = data.subarray(offset, offset + frameSize);
        frames.push(frameData);
        offset += frameSize;
    }

    debugLog(`SimpleBlock with lacing type ${LACING_TYPES[lacingType]}, ${numFrames} frames, sizes=[${frameSizes.join(', ')}]`);
    return frames;
};

