export type OggPage = {
    version: number,
    headerType: number,
    granulePosition: bigint,
    serialNumber: number,
    pageSequence: number,
    checksum: number,
    segments: number,
    bodySize: number,
    pageSize: number,
    offset: number,
}