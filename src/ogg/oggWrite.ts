import { calculateCRC } from "./oggCrc";

/**
 * Create a minimal OpusTags page with length/duration info omitted
 * @param serialNumber stream serial number
 * @param pageSequence page sequence number
 * @returns Uint8Array representing the OpusTags page
 */
export const createMinimalOpusTagsPage = (
    serialNumber: number,
    pageSequence: number,
): Uint8Array => {
    const vendorString = "ogg-opus-concat";
    const vendorLength = vendorString.length;

    // OpusTags structure:
    // - "OpusTags" magic signature (8 bytes)
    // - vendor string length (4 bytes, little-endian)
    // - vendor string
    // - user comment list length (4 bytes, little-endian) = 0
    const bodySize = 8 + 4 + vendorLength + 4;
    const body = new Uint8Array(bodySize);
    let offset = 0;

    // Magic signature
    body.set(new TextEncoder().encode("OpusTags"), offset);
    offset += 8;

    // Vendor string length (little-endian)
    body[offset++] = vendorLength & 0xff;
    body[offset++] = (vendorLength >> 8) & 0xff;
    body[offset++] = (vendorLength >> 16) & 0xff;
    body[offset++] = (vendorLength >> 24) & 0xff;

    // Vendor string
    body.set(new TextEncoder().encode(vendorString), offset);
    offset += vendorLength;

    // User comment list length = 0
    body[offset++] = 0;
    body[offset++] = 0;
    body[offset++] = 0;
    body[offset++] = 0;

    // Create Ogg page with proper segment table
    const segments = Math.ceil(bodySize / 255);
    const segmentTable = new Uint8Array(segments);
    for (let i = 0; i < segments - 1; i++) {
        segmentTable[i] = 255;
    }
    segmentTable[segments - 1] = bodySize % 255 || 255;

    const pageSize = 27 + segments + bodySize;
    const page = new Uint8Array(pageSize);
    const view = new DataView(page.buffer);

    // OggS magic
    page[0] = 0x4f;
    page[1] = 0x67;
    page[2] = 0x67;
    page[3] = 0x53;

    // Version
    page[4] = 0;

    // Header type (continuation of logical bitstream)
    page[5] = 0x00;

    // Granule position (0 for header)
    view.setBigInt64(6, BigInt(0), true);

    // Serial number
    view.setUint32(14, serialNumber, true);

    // Page sequence
    view.setUint32(18, pageSequence, true);

    // Checksum (will be calculated below)
    view.setUint32(22, 0, true);

    // Segments
    page[26] = segments;

    // Segment table
    page.set(segmentTable, 27);

    // Body
    page.set(body, 27 + segments);

    // Calculate and set checksum
    const crc = calculateCRC(page);
    view.setUint32(22, crc, true);

    return page;
};

/**
 * Create an OpusHead identification header page
 */
export const createOpusHeadPage = (
    serialNumber: number,
    channels: number = 2,
    preskip: number = 312, // Standard Opus pre-skip
    sampleRate: number = 48000,
): Uint8Array => {
    // OpusHead structure (19 bytes):
    // - "OpusHead" magic (8 bytes)
    // - version (1 byte) = 1
    // - channel count (1 byte)
    // - pre-skip (2 bytes, little-endian)
    // - input sample rate (4 bytes, little-endian)
    // - output gain (2 bytes, little-endian) = 0
    // - channel mapping family (1 byte) = 0
    
    const body = new Uint8Array(19);
    const view = new DataView(body.buffer);
    let offset = 0;
    
    // Magic signature
    body.set(new TextEncoder().encode('OpusHead'), offset);
    offset += 8;
    
    // Version
    body[offset++] = 1;
    
    // Channel count
    body[offset++] = channels;
    
    // Pre-skip
    view.setUint16(offset, preskip, true);
    offset += 2;
    
    // Input sample rate
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    
    // Output gain
    view.setInt16(offset, 0, true);
    offset += 2;
    
    // Channel mapping family
    body[offset++] = 0;
    
    // Create Ogg page
    return createOggPage({
        headerType: 0x02, // BOS (Beginning of Stream)
        granulePosition: BigInt(0),
        serialNumber,
        pageSequence: 0,
        body,
    });
};

/**
 * Create an Ogg page from body data
 */
export const createOggPage = (options: {
    headerType: number;
    granulePosition: bigint;
    serialNumber: number;
    pageSequence: number;
    body: Uint8Array;
}): Uint8Array => {
    const { headerType, granulePosition, serialNumber, pageSequence, body } = options;
    
    // Calculate segment table
    const bodySize = body.length;
    const fullSegments = Math.floor(bodySize / 255);
    const lastSegmentSize = bodySize % 255;
    const segments = fullSegments + (lastSegmentSize > 0 ? 1 : 0);
    
    const segmentTable = new Uint8Array(segments);
    for (let i = 0; i < fullSegments; i++) {
        segmentTable[i] = 255;
    }
    if (lastSegmentSize > 0) {
        segmentTable[fullSegments] = lastSegmentSize;
    }
    
    // Create page
    const pageSize = 27 + segments + bodySize;
    const page = new Uint8Array(pageSize);
    const view = new DataView(page.buffer);
    
    // OggS magic
    page[0] = 0x4f; // 'O'
    page[1] = 0x67; // 'g'
    page[2] = 0x67; // 'g'
    page[3] = 0x53; // 'S'
    
    // Version
    page[4] = 0;
    
    // Header type
    page[5] = headerType;
    
    // Granule position
    view.setBigInt64(6, granulePosition, true);
    
    // Serial number
    view.setUint32(14, serialNumber, true);
    
    // Page sequence
    view.setUint32(18, pageSequence, true);
    
    // Checksum (calculate later)
    view.setUint32(22, 0, true);
    
    // Segment count
    page[26] = segments;
    
    // Segment table
    page.set(segmentTable, 27);
    
    // Body
    page.set(body, 27 + segments);
    
    // Calculate and set checksum
    const crc = calculateCRC(page);
    view.setUint32(22, crc, true);
    
    return page;
};

/**
 * Calculate granule position for an Opus packet
 * Opus uses 48kHz sample rate, typical frame is 20ms = 960 samples
 */
const calculateOpusGranule = (packetIndex: number, samplesPerPacket: number = 960): bigint => {
    return BigInt((packetIndex + 1) * samplesPerPacket);
};

/**
 * Wrap raw Opus packets into a complete Ogg Opus file
 */
export const wrapOpusPacketsInOgg = (
    packets: Uint8Array[],
    options?: {
        channels?: number;
        preskip?: number;
        sampleRate?: number;
        serialNumber?: number;
    }
): Uint8Array => {
    const channels = options?.channels || 2;
    const preskip = options?.preskip || 312;
    const sampleRate = options?.sampleRate || 48000;
    const serialNumber = options?.serialNumber || Math.floor(Math.random() * 0xFFFFFFFF);
    
    const pages: Uint8Array[] = [];
    let pageSequence = 0;
    
    // Page 0: OpusHead
    const opusHead = createOpusHeadPage(serialNumber, channels, preskip, sampleRate);
    pages.push(opusHead);
    pageSequence++;
    
    // Page 1: OpusTags (minimal)
    const opusTags = createMinimalOpusTagsPage(serialNumber, pageSequence);
    pages.push(opusTags);
    pageSequence++;
    
    // Data pages: wrap packets
    // Group multiple packets per page for efficiency (max ~4KB per page)
    const MAX_PAGE_SIZE = 4000;
    let currentPagePackets: Uint8Array[] = [];
    let currentPageSize = 0;
    
    for (let i = 0; i < packets.length; i++) {
        const packet = packets[i];
        
        // Check if adding this packet would exceed page size
        if (currentPageSize + packet.length > MAX_PAGE_SIZE && currentPagePackets.length > 0) {
            // Flush current page
            const pageBody = new Uint8Array(currentPageSize);
            let offset = 0;
            for (const p of currentPagePackets) {
                pageBody.set(p, offset);
                offset += p.length;
            }
            
            const granule = calculateOpusGranule(i - 1); // Granule of last packet in page
            const page = createOggPage({
                headerType: 0x00,
                granulePosition: granule,
                serialNumber,
                pageSequence,
                body: pageBody,
            });
            
            pages.push(page);
            pageSequence++;
            
            // Reset for next page
            currentPagePackets = [];
            currentPageSize = 0;
        }
        
        currentPagePackets.push(packet);
        currentPageSize += packet.length;
    }
    
    // Flush remaining packets
    if (currentPagePackets.length > 0) {
        const pageBody = new Uint8Array(currentPageSize);
        let offset = 0;
        for (const p of currentPagePackets) {
            pageBody.set(p, offset);
            offset += p.length;
        }
        
        const granule = calculateOpusGranule(packets.length - 1);
        const page = createOggPage({
            headerType: 0x04, // EOS (End of Stream) on last page
            granulePosition: granule,
            serialNumber,
            pageSequence,
            body: pageBody,
        });
        
        pages.push(page);
    }
    
    // Combine all pages
    const totalSize = pages.reduce((sum, page) => sum + page.length, 0);
    const result = new Uint8Array(totalSize);
    let resultOffset = 0;
    for (const page of pages) {
        result.set(page, resultOffset);
        resultOffset += page.length;
    }
    
    return result;
};