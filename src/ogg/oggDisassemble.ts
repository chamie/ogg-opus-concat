import { OpusFrame, OpusStream } from "../types/opus";
import { findOggStart, parseOggPage } from "./oggParsing";
import debug from "../common/debugger";

export const disassembleOgg = (data: Uint8Array, isChunk: boolean): OpusStream => {
    const oggStart = isChunk ? 0 : findOggStart(data);
    if (oggStart === -1) {
        throw new Error('No Ogg data found');
    }

    if (oggStart > 0) {
        debug.debugLog(`Skipping ${oggStart} bytes of non-Ogg data at start`);
    }

    const frames: OpusFrame[] = [];
    let offset = oggStart;
    let pageCount = 0;
    let serialNumber: number | undefined;
    let channels = 1;
    let preskip = 312;
    let sampleRate = 48000;
    let lastGranule = BigInt(0);

    while (offset < data.length) {
        const page = parseOggPage(data, offset);
        if (!page) {
            debug.debugLog(`Failed to parse Ogg page at offset ${offset}`);
            break;
        }

        if (pageCount === 0 && !isChunk) {
            // Parse OpusHead for metadata
            serialNumber = page.serialNumber;
            const bodyOffset = 27 + page.segments;
            channels = data[offset + bodyOffset + 9];
            const view = new DataView(data.buffer, data.byteOffset + offset + bodyOffset);
            preskip = view.getUint16(10, true);
            sampleRate = view.getUint32(12, true);
            debug.debugLog(`OpusHead: channels=${channels}, preskip=${preskip}, sampleRate=${sampleRate}, serial=${serialNumber}`);
        } else if (pageCount === 1 && !isChunk) {
            // Skip OpusTags
            debug.debugLog(`Skipping OpusTags page`);
        } else {
            // Data page - extract frame(s)
            const bodyOffset = 27 + page.segments;
            const bodyEnd = bodyOffset + page.bodySize;

            // Calculate samples for this page
            const currentGranule = page.granulePosition;
            const samples = Number(currentGranule - lastGranule);
            debug.debugLog(`Data page ${pageCount}: granule=${currentGranule}, samples=${samples}, size=${page.bodySize}`);

            // For simplicity, treat entire page body as one frame
            // (In reality, pages can contain multiple frames with lacing)
            frames.push({
                data: data.subarray(offset + bodyOffset, offset + bodyEnd),
                samples: samples,
            });

            lastGranule = currentGranule;
        }

        offset += page.pageSize;
        pageCount++;
    }

    debug.debugLog(`Disassembled ${frames.length} frames from Ogg, total granule: ${lastGranule}`);

    return {
        frames,
        serialNumber,
        channels,
        preskip,
        sampleRate,
    };
};