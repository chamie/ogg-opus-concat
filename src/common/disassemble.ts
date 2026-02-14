import { disassembleOgg } from "../ogg/oggDisassemble";
import { OpusStream } from "../types/opus";
import { disassembleWebM } from "../webm/webmDisassemble";
import { AudioFormat } from "./audioTypes";
import { detectFormat } from "./formatDetection";
import debug from "./debugger";

const debugLog = (...args: any[]) => debug.debugLog('disassembler', ...args);

/**
 * Format-agnostic disassembly: detects format and extracts Opus frames
 * @param data - The input audio file data as a Uint8Array
 * @param chunkFormat - (Optional) Specify format if known (for chunks that may lack headers)
 * @returns An OpusStream containing extracted Opus frames and metadata
 */
export const disassembleOpusFile = (data: Uint8Array, chunkFormat?: AudioFormat): OpusStream => {
    const isChunk = chunkFormat !== undefined;

    const format = isChunk ? chunkFormat : detectFormat(data);
    
    debugLog(`Detected format: ${AudioFormat[format]}`);
    
    switch (format) {
        case AudioFormat.OGG_OPUS:
            return disassembleOgg(data, isChunk);
        case AudioFormat.WEBM:
            return disassembleWebM(data, isChunk);
        case AudioFormat.UNKNOWN:
            throw new Error('Unknown audio format (not Ogg Opus or WebM)');
    }
};