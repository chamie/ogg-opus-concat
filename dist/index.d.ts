declare enum AudioFormat {
    OGG_OPUS = 0,
    WEBM = 1,
    UNKNOWN = 2
}

type DebugCategory = 'parser' | 'disassembler' | 'assembler' | 'index';

declare const setDebug: (enabled: boolean) => void;
declare const setDebugCategories: (categories: DebugCategory[]) => Set<DebugCategory>;
declare const setCustomDebugLogger: (logger: (...args: any[]) => void) => void;
/**
 * Concatenate multiple Opus-in-Ogg or Opus-in-WebM files into a single logical bitstream.
 * Adjusts page headers, granule positions, and replaces OpusTags.
 */
declare const concatChunks: (chunks: Uint8Array[]) => Uint8Array;
interface AccumulatorState {
    serialNumber: number;
    lastPageSequence: number;
    cumulativeGranule: bigint;
    totalSize: number;
}
/**
 * Parse and prepare an existing Opus file (Ogg or WebM container) for appending
 * Returns the prepared file (with EOS cleared, OpusTags replaced) and metadata
 * required for concatenation of more files within the same logical bitstream.
 */
declare const prepareAccumulator: (data: Uint8Array) => {
    result: Uint8Array;
    meta: AccumulatorState;
};
/**
 * Append new files (complete containers) to an existing accumulator
 * @param acc File to append to
 * @param files additional files to append, `.opus` (opus-in-ogg) files
 * @param accMeta Metadata about the current accumulator state
 * @param chunkFormat Format if using chunks, for chunks lack headers
 * @returns Updated accumulator (concatenated Opus file ready for further appending) and metadata for next append
 */
declare const appendToAccumulator: (acc: Uint8Array, files: Uint8Array[], accMeta: AccumulatorState, chunkFormat?: AudioFormat) => {
    result: Uint8Array;
    meta: AccumulatorState;
};

export { type AccumulatorState, appendToAccumulator, concatChunks, prepareAccumulator, setCustomDebugLogger, setDebug, setDebugCategories };
