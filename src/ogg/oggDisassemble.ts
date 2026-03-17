import { OpusFrame, OpusStream } from "../types/opus";
import { findOggStart, parseOggPage } from "./oggParsing";
import { getOpusSamples } from "../opus/opusParsing";
import { debugLog } from "../common/disassemble";

export const disassembleOgg = (data: Uint8Array, isChunk: boolean): OpusStream => {
    const oggStart = isChunk ? 0 : findOggStart(data);
    if (oggStart === -1) {
        throw new Error('No Ogg data found');
    }

    if (oggStart > 0) {
        debugLog(`Skipping ${oggStart} bytes of non-Ogg data at start`);
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
            debugLog(`Failed to parse Ogg page at offset ${offset}`);
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
            debugLog(`OpusHead: channels=${channels}, preskip=${preskip}, sampleRate=${sampleRate}, serial=${serialNumber}`);
        } else if (pageCount === 1 && !isChunk) {
            // Skip OpusTags
            debugLog(`Skipping OpusTags page`);
        } else {
            // Data page - extract individual Opus packets using segment table
            const segmentTableOffset = offset + 27;
            const bodyOffset = segmentTableOffset + page.segments;

            // Parse segment table to find packet boundaries
            // A packet ends when a segment value is < 255
            let packetStart = bodyOffset;
            let packetSize = 0;

            for (let s = 0; s < page.segments; s++) {
                const segmentSize = data[segmentTableOffset + s];
                packetSize += segmentSize;

                if (segmentSize < 255) {
                    // End of packet
                    if (packetSize > 0) {
                        const packetData = data.subarray(packetStart, packetStart + packetSize);
                        const samples = getOpusSamples(packetData);
                        debugLog(`Data page ${pageCount}, packet: offset=${packetStart}, size=${packetSize}, samples=${samples}`);
                        frames.push({
                            data: packetData,
                            samples,
                        });
                    }
                    packetStart += packetSize;
                    packetSize = 0;
                }
            }

            // Handle packet that ends exactly on a page boundary (last segment was 255)
            if (packetSize > 0) {
                const packetData = data.subarray(packetStart, packetStart + packetSize);
                const samples = getOpusSamples(packetData);
                debugLog(`Data page ${pageCount}, spanning packet: offset=${packetStart}, size=${packetSize}, samples=${samples}`);
                frames.push({
                    data: packetData,
                    samples,
                });
            }

            lastGranule = page.granulePosition;
        }

        offset += page.pageSize;
        pageCount++;
    }

    debugLog(`Disassembled ${frames.length} frames from Ogg, total granule: ${lastGranule}`);

    return {
        frames,
        serialNumber,
        channels,
        preskip,
        sampleRate,
    };
};