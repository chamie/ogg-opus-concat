/**
 * Known Matroska/WebM element IDs
 */
export const EBML_IDS = {
    // Containers:
    EBML: BigInt("0x1A45DFA3"),
    Segment: BigInt("0x18538067"),
    Tracks: BigInt("0x1654AE6B"),
    TrackEntry: BigInt("0xAE"),
    Cluster: BigInt("0x1F43B675"),
    BlockGroup: BigInt("0xA0"),

    // Leaves:
    SimpleBlock: BigInt("0xA3"),
    CodecID: BigInt("0x86"),
    ChannelCount: BigInt("0x9F"),
    SamplingFrequency: BigInt("0xB5"),
    TrackNumber: BigInt("0xD7"),
}

export enum LACING_TYPES {
    NONE = 0,
    XIPH = 1,
    FIXED_SIZE = 2,
    EBML = 3,
};