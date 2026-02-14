import { OggPage } from "./oggTypes";

/**
 * Scan for first "OggS" magic bytes in data
 * @param data 
 * @returns position of first OggS or -1 if not found
 */
export const findOggStart = (data: Uint8Array): number => {
    for (let i = 0; i <= data.length - 4; i++) {
        if (data[i] === 0x4f && data[i + 1] === 0x67 &&
            data[i + 2] === 0x67 && data[i + 3] === 0x53) {
            return i;
        }
    }
    return -1; // Not found
};


export const parseOggPage = (data: Uint8Array, offset: number): OggPage | null => {
    if (offset + 27 > data.length) return null;

    // Check for "OggS" magic
    if (
        data[offset] !== 0x4f ||
        data[offset + 1] !== 0x67 ||
        data[offset + 2] !== 0x67 ||
        data[offset + 3] !== 0x53
    ) {
        return null;
    }

    const view = new DataView(data.buffer, data.byteOffset + offset);

    const version = data[offset + 4];
    const headerType = data[offset + 5];
    const granulePosition = view.getBigInt64(6, true);
    const serialNumber = view.getUint32(14, true);
    const pageSequence = view.getUint32(18, true);
    const checksum = view.getUint32(22, true);
    const segments = data[offset + 26];

    let bodySize = 0;
    for (let i = 0; i < segments; i++) {
        bodySize += data[offset + 27 + i];
    }

    const pageSize = 27 + segments + bodySize;

    return {
        version,
        headerType,
        granulePosition,
        serialNumber,
        pageSequence,
        checksum,
        segments,
        bodySize,
        pageSize,
        offset,
    };
};