import { findOggStart } from "../ogg/oggParsing";
import { AudioFormat } from "./audioTypes";

export const detectFormat = (data: Uint8Array): AudioFormat => {
    // Check for Ogg
    const oggStart = findOggStart(data);
    if (oggStart !== -1) {
        return AudioFormat.OGG_OPUS;
    }

    // Check for WebM/Matroska EBML header (0x1A45DFA3)
    if (data.length >= 4 &&
        data[0] === 0x1A &&
        data[1] === 0x45 &&
        data[2] === 0xDF &&
        data[3] === 0xA3) {
        return AudioFormat.WEBM;
    }

    return AudioFormat.UNKNOWN;
};