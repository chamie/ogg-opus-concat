import { OpusStream, RawOpusStream } from "../types/opus";
import { createMinimalOpusTagsPage, createOggPage, createOpusHeadPage } from "./oggWrite";
import debug from "../common/debugger";

export const debugLog = (...args: any[]) => debug.debugLog('assembler', ...args);

type AssembleResult = {
    data: Uint8Array;
    pageCount: number;
    finalGranule: bigint;
};
type DataPageOptions = {
    serialNumber: number;
    startingSequence: number;
    startingGranule: bigint;
    includeHeaders: false;
};

type HeaderOptions = {
    includeHeaders: true;
    serialNumber?: number;
    startingSequence?: number;
    startingGranule?: bigint;
};

/**
 * Assemble frames into appendable Ogg Opus file
 * @param stream 
 * @param options 
 * @returns 
 */
export function assembleOgg(
    stream: RawOpusStream,
    options: DataPageOptions,
): AssembleResult;

export function assembleOgg(
    stream: OpusStream,
    options: HeaderOptions,
): AssembleResult;

export function assembleOgg(
    stream: RawOpusStream | OpusStream,
    options: DataPageOptions | HeaderOptions,
): AssembleResult {
    const includeHeaders = options.includeHeaders;

    const serialNumber =
        options.serialNumber ??
        ("serialNumber" in stream ? stream.serialNumber : undefined) ??
        Math.floor(Math.random() * 0xFFFFFFFF);

    let pageSequence = options.startingSequence ?? 0;

    let granule = options.startingGranule ?? BigInt(0);

    const pages: Uint8Array[] = [];
    let pageCount = 0;

    // Add headers if requested
    if (includeHeaders) {
        if (!("channels" in stream)) {
            throw new Error("Cannot include headers for a raw Opus stream");
        }
        
        debugLog(`Creating OpusHead: serial=${serialNumber}, channels=${stream.channels}, preskip=${stream.preskip}, sampleRate=${stream.sampleRate}`);

        pages.push(createOpusHeadPage(serialNumber, stream.channels, stream.preskip, stream.sampleRate));
        pageSequence++;
        pageCount++;

        debugLog(`Creating minimal OpusTags: sequence=${pageSequence}`);

        pages.push(createMinimalOpusTagsPage(serialNumber, pageSequence));
        pageSequence++;
        pageCount++;
    } else {
        debugLog(`Assembling data pages only (no headers), starting at sequence=${pageSequence}, granule=${granule}`);
    }

    // Add data pages
    const MAX_PAGE_SIZE = 4000;
    let currentPageData: Uint8Array[] = [];
    let currentPageSize = 0;
    let currentPageSamples = 0;

    for (const frame of stream.frames) {
        // Flush page if needed
        if (currentPageSize + frame.data.length > MAX_PAGE_SIZE && currentPageData.length > 0) {
            const pageBody = new Uint8Array(currentPageSize);

            debugLog(`Flushing page: sequence=${pageSequence}, granule=${granule}, size=${pageBody.length}, packets=${currentPageData.length}`);

            let offset = 0;
            for (const d of currentPageData) {
                pageBody.set(d, offset);
                offset += d.length;
            }

            granule += BigInt(currentPageSamples);

            const page = createOggPage({
                headerType: 0x00,
                granulePosition: granule,
                serialNumber,
                pageSequence,
                body: pageBody,
                packetSizes: currentPageData.map(d => d.length),
            });

            pages.push(page);
            pageSequence++;
            pageCount++;

            currentPageData = [];
            currentPageSize = 0;
            currentPageSamples = 0;
        }

        currentPageData.push(frame.data);
        currentPageSize += frame.data.length;
        currentPageSamples += frame.samples;
    }

    // Flush remaining
    if (currentPageData.length > 0) {
        const pageBody = new Uint8Array(currentPageSize);
        let offset = 0;
        for (const d of currentPageData) {
            pageBody.set(d, offset);
            offset += d.length;
        }

        granule += BigInt(currentPageSamples);

        const page = createOggPage({
            headerType: 0x00,
            granulePosition: granule,
            serialNumber,
            pageSequence,
            body: pageBody,
            packetSizes: currentPageData.map(d => d.length),
        });

        pages.push(page);
        pageCount++;
    }

    // Combine pages
    const totalSize = pages.reduce((sum, p) => sum + p.length, 0);
    const data = new Uint8Array(totalSize);
    let resultOffset = 0;
    for (const page of pages) {
        data.set(page, resultOffset);
        resultOffset += page.length;
    }

    debugLog(`Assembled ${pageCount} pages, final granule: ${granule}, total size: ${data.length} bytes`);

    return { data, pageCount, finalGranule: granule };
};