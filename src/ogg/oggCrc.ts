// CRC32 lookup table
const makeCRCTable = (): Uint32Array => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i << 24;
        for (let j = 0; j < 8; j++) {
            c = c & 0x80000000 ? (c << 1) ^ 0x04c11db7 : c << 1;
        }
        table[i] = c >>> 0;
    }
    return table;
};

const crcTable: Uint32Array = makeCRCTable();

export const calculateCRC = (data: Uint8Array): number => {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
        crc = ((crc << 8) ^ crcTable[((crc >>> 24) ^ data[i]) & 0xff]) >>> 0;
    }
    return crc;
};