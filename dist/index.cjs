"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  appendToAccumulator: () => appendToAccumulator,
  concatChunks: () => concatChunks,
  prepareAccumulator: () => prepareAccumulator,
  setCustomDebugLogger: () => setCustomDebugLogger,
  setDebug: () => setDebug,
  setDebugCategories: () => setDebugCategories
});
module.exports = __toCommonJS(index_exports);

// src/common/debugger.ts
var exported = {
  isDebug: false,
  customLogger: null,
  enabledCategories: /* @__PURE__ */ new Set([]),
  debugLog: (category, ...args) => {
    if (!exported.isDebug) return;
    if (exported.enabledCategories.size && !exported.enabledCategories.has(category)) return;
    if (exported.customLogger) {
      exported.customLogger(category, ...args);
    } else {
      console.debug(`Category: ${category}`, ...args);
    }
  }
};
var debugger_default = exported;

// src/ogg/oggParsing.ts
var findOggStart = (data) => {
  for (let i = 0; i <= data.length - 4; i++) {
    if (data[i] === 79 && data[i + 1] === 103 && data[i + 2] === 103 && data[i + 3] === 83) {
      return i;
    }
  }
  return -1;
};
var parseOggPage = (data, offset) => {
  if (offset + 27 > data.length) return null;
  if (data[offset] !== 79 || data[offset + 1] !== 103 || data[offset + 2] !== 103 || data[offset + 3] !== 83) {
    return null;
  }
  const view = new DataView(data.buffer, data.byteOffset + offset);
  const version = data[offset + 4];
  const headerType = data[offset + 5];
  const granulePosition = view.getBigInt64(6, true);
  const serialNumber = view.getUint32(14, true);
  const pageSequence = view.getUint32(18, true);
  const checksum = view.getUint32(22, true);
  const segments = data[offset + 26];
  let bodySize = 0;
  for (let i = 0; i < segments; i++) {
    bodySize += data[offset + 27 + i];
  }
  const pageSize = 27 + segments + bodySize;
  return {
    version,
    headerType,
    granulePosition,
    serialNumber,
    pageSequence,
    checksum,
    segments,
    bodySize,
    pageSize,
    offset
  };
};

// src/ogg/oggDisassemble.ts
var disassembleOgg = (data, isChunk) => {
  const oggStart = isChunk ? 0 : findOggStart(data);
  if (oggStart === -1) {
    throw new Error("No Ogg data found");
  }
  if (oggStart > 0) {
    debugger_default.debugLog(`Skipping ${oggStart} bytes of non-Ogg data at start`);
  }
  const frames = [];
  let offset = oggStart;
  let pageCount = 0;
  let serialNumber;
  let channels = 1;
  let preskip = 312;
  let sampleRate = 48e3;
  let lastGranule = BigInt(0);
  while (offset < data.length) {
    const page = parseOggPage(data, offset);
    if (!page) {
      debugger_default.debugLog(`Failed to parse Ogg page at offset ${offset}`);
      break;
    }
    if (pageCount === 0 && !isChunk) {
      serialNumber = page.serialNumber;
      const bodyOffset = 27 + page.segments;
      channels = data[offset + bodyOffset + 9];
      const view = new DataView(data.buffer, data.byteOffset + offset + bodyOffset);
      preskip = view.getUint16(10, true);
      sampleRate = view.getUint32(12, true);
      debugger_default.debugLog(`OpusHead: channels=${channels}, preskip=${preskip}, sampleRate=${sampleRate}, serial=${serialNumber}`);
    } else if (pageCount === 1 && !isChunk) {
      debugger_default.debugLog(`Skipping OpusTags page`);
    } else {
      const bodyOffset = 27 + page.segments;
      const bodyEnd = bodyOffset + page.bodySize;
      const currentGranule = page.granulePosition;
      const samples = Number(currentGranule - lastGranule);
      debugger_default.debugLog(`Data page ${pageCount}: granule=${currentGranule}, samples=${samples}, size=${page.bodySize}`);
      frames.push({
        data: data.subarray(offset + bodyOffset, offset + bodyEnd),
        samples
      });
      lastGranule = currentGranule;
    }
    offset += page.pageSize;
    pageCount++;
  }
  debugger_default.debugLog(`Disassembled ${frames.length} frames from Ogg, total granule: ${lastGranule}`);
  return {
    frames,
    serialNumber,
    channels,
    preskip,
    sampleRate
  };
};

// src/webm/EBMLTypes.ts
var EBML_IDS = {
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
  TrackNumber: BigInt("0xD7")
};
var LACING_TYPES = /* @__PURE__ */ ((LACING_TYPES2) => {
  LACING_TYPES2[LACING_TYPES2["NONE"] = 0] = "NONE";
  LACING_TYPES2[LACING_TYPES2["XIPH"] = 1] = "XIPH";
  LACING_TYPES2[LACING_TYPES2["FIXED_SIZE"] = 2] = "FIXED_SIZE";
  LACING_TYPES2[LACING_TYPES2["EBML"] = 3] = "EBML";
  return LACING_TYPES2;
})(LACING_TYPES || {});

// src/webm/webmParse.ts
var debugLog = (...args) => debugger_default.debugLog("parser", ...args);
var readVINT = (data, offset, isId = false) => {
  let firstByte = data[offset];
  const width = Math.clz32(firstByte) - 24 + 1;
  if (width < 1) {
    throw new Error("Invalid EBML VINT width");
  }
  if (!isId) {
    const markerBit = 1 << 8 - width;
    firstByte &= ~markerBit;
  }
  let value = BigInt(firstByte);
  for (let i = 1; i < width; i++) {
    value = value << BigInt(8) | BigInt(data[offset + i]);
  }
  const maxValue = (BigInt(1) << BigInt(width * 7)) - BigInt(1);
  const isUnknown = value === maxValue;
  debugLog(`Read VINT at offset ${offset}: value=${value}, size=${width}, isUnknown=${isUnknown}, bytes=[
${Array.from(data.subarray(offset, offset + width)).map((b) => b.toString(16).padStart(2, "0")).join(" ")}
]`);
  return {
    value,
    size: width,
    isUnknown
  };
};
var readId = (data, offset) => readVINT(data, offset, true);
var decodeString = (data, offset, length) => new TextDecoder("utf-8").decode(data.subarray(offset, offset + length)).replace(/\0/g, "");
var decodeSignedVint = (value, width) => {
  const range = (BigInt(1) << BigInt(7 * width - 1)) - BigInt(1);
  return value - range;
};
var processSimpleBlock = (data, lacingType) => {
  if (lacingType === 0 /* NONE */) {
    debugLog(`SimpleBlock with no lacing, single frame of size ${data.length} bytes`);
    return [data];
  }
  const numFrames = data[0] + 1;
  let offset = 1;
  const frameSizes = [];
  if (lacingType === 2 /* FIXED_SIZE */) {
    const totalSize = data.length - 1;
    const frameSize = Math.floor(totalSize / numFrames);
    for (let i = 0; i < numFrames; i++) {
      frameSizes.push(frameSize);
    }
  } else {
    switch (lacingType) {
      case 1 /* XIPH */:
        for (let i = 0; i < numFrames - 1; i++) {
          let size = 0;
          let byte = 255;
          while (byte === 255) {
            byte = data[offset++];
            size += byte;
          }
          frameSizes.push(size);
        }
        break;
      case 3 /* EBML */:
        let { value: firstSize, size: firstSizeLen } = readVINT(data, offset);
        offset += firstSizeLen;
        frameSizes.push(Number(firstSize));
        let previousSize = firstSize;
        for (let i = 1; i < numFrames - 1; i++) {
          let { value: sizeDiffRaw, size: sizeDiffLen } = readVINT(data, offset);
          offset += sizeDiffLen;
          const sizeDiff = BigInt(decodeSignedVint(sizeDiffRaw, sizeDiffLen));
          const frameSize = previousSize + sizeDiff;
          frameSizes.push(Number(frameSize));
          previousSize = frameSize;
        }
        break;
    }
    const totalKnownSizes = frameSizes.reduce((a, b) => a + b, 0);
    const lastFrameSize = data.length - offset - totalKnownSizes;
    frameSizes.push(lastFrameSize);
  }
  const frames = [];
  for (const frameSize of frameSizes) {
    const frameData = data.subarray(offset, offset + frameSize);
    frames.push(frameData);
    offset += frameSize;
  }
  debugLog(`SimpleBlock with lacing type ${LACING_TYPES[lacingType]}, ${numFrames} frames, sizes=[${frameSizes.join(", ")}]`);
  return frames;
};

// src/opus/opusParsing.ts
var getOpusSamples = (opusPacket) => {
  const toc = opusPacket[0];
  const config = toc >> 3 & 31;
  const frameSizes = [
    480,
    960,
    1920,
    2880,
    // SILK-only (NB)
    480,
    960,
    1920,
    2880,
    // SILK-only (MB)
    480,
    960,
    1920,
    2880,
    // SILK-only (WB)
    480,
    960,
    1920,
    2880,
    // Hybrid (SWB)
    480,
    960,
    1920,
    2880,
    // Hybrid (FB)
    120,
    240,
    480,
    960,
    // CELT-only (NB)
    120,
    240,
    480,
    960,
    // CELT-only (WB)
    120,
    240,
    480,
    960,
    // CELT-only (SWB)
    120,
    240,
    480,
    960
    // CELT-only (FB)
  ];
  return frameSizes[config] || 960;
};

// src/webm/webmDisassemble.ts
var debugLog2 = (...args) => debugger_default.debugLog("disassembler", ...args);
var disassembleWebM = (data, isChunk) => {
  debugLog2("Extracting WebM frames");
  const { frames: webMFrames, channels, sampleRate } = extractFramesAndMeta(data, isChunk);
  debugLog2(`Extracted ${webMFrames.length} WebM frames`);
  const preskip = 312;
  debugLog2(`Using channels=${channels}, preskip=${preskip}, sampleRate=${sampleRate}`);
  const frames = webMFrames.map((frame) => ({
    data: frame,
    samples: getOpusSamples(frame)
    // WebM doesn't store this, assume 20ms frames
  }));
  debugLog2(`Converted to ${frames.length} Opus frames`);
  debugLog2(`Returning Opus stream with channels=${channels}, preskip=${preskip}, sampleRate=${sampleRate}`);
  return {
    frames,
    channels,
    preskip,
    sampleRate
  };
};
var extractFramesAndMeta = (buffer, isChunk) => {
  const parentEnds = [buffer.length];
  const frames = [];
  let offset = 0;
  let currentTrackEntryNo = -1;
  let opusTrackNo = -1;
  let elementsCount = 0;
  let channels = 1;
  let sampleRate = 48e3;
  while (parentEnds.length > 0) {
    elementsCount++;
    const currentEnd = parentEnds[parentEnds.length - 1];
    if (offset >= currentEnd) {
      parentEnds.pop();
      continue;
    }
    const id = readId(buffer, offset);
    const elementSize = readVINT(buffer, offset + id.size);
    const dataStart = offset + id.size + elementSize.size;
    const dataEnd = elementSize.isUnknown ? currentEnd : dataStart + Number(elementSize.value);
    switch (id.value) {
      // --- CONTAINERS: Enter (Push to stack and continue to the body) ---
      case EBML_IDS.EBML:
      case EBML_IDS.Segment:
      case EBML_IDS.Tracks:
      case EBML_IDS.TrackEntry:
      case EBML_IDS.Cluster:
        parentEnds.push(dataEnd);
        offset = dataStart;
        debugLog2(`Entering container ID 0x${id.value.toString(16)} at offset ${offset}, ends at ${dataEnd}`);
        break;
      // --- LEAF ELEMENTS WITH REQUIRED DATA (Process) ---
      // Metadata needed to interpret Opus frames:
      case EBML_IDS.TrackNumber:
        const trackNo = readVINT(buffer, dataStart);
        currentTrackEntryNo = Number(trackNo.value);
        offset = dataEnd;
        debugLog2(`Found TrackEntry number: ${currentTrackEntryNo}`);
        break;
      case EBML_IDS.CodecID:
        const codec = decodeString(buffer, dataStart, Number(elementSize.value));
        if (codec === "A_OPUS") {
          opusTrackNo = currentTrackEntryNo;
          debugLog2(`Identified Opus track number: ${opusTrackNo}`);
        }
        offset = dataEnd;
        debugLog2(`Processed CodecID: ${codec} for TrackEntry number: ${currentTrackEntryNo}`);
        break;
      case EBML_IDS.ChannelCount:
        if (currentTrackEntryNo !== opusTrackNo) {
          offset = dataEnd;
          debugLog2(`Skipping ChannelCount for non-Opus TrackEntry number: ${currentTrackEntryNo}`);
          break;
        }
        channels = Number(readVINT(buffer, dataStart).value);
        offset = dataEnd;
        debugLog2(`Processed ChannelCount: ${channels} for TrackEntry number: ${currentTrackEntryNo}`);
        break;
      case EBML_IDS.SamplingFrequency:
        if (currentTrackEntryNo !== opusTrackNo) {
          offset = dataEnd;
          debugLog2(`Skipping SamplingFrequency for non-Opus TrackEntry number: ${currentTrackEntryNo}`);
          break;
        }
        sampleRate = Number(readVINT(buffer, dataStart).value);
        offset = dataEnd;
        debugLog2(`Processed SamplingFrequency: ${sampleRate} for TrackEntry number: ${currentTrackEntryNo}`);
        break;
      // Actual Opus frame data:
      case EBML_IDS.SimpleBlock:
        offset = dataEnd;
        debugLog2(`Processing SimpleBlock at offset ${dataStart}`);
        if (!isChunk && opusTrackNo === -1) {
          debugLog2(`No Opus track identified yet, skipping SimpleBlock`);
          break;
        }
        const blockTrackNo = readVINT(buffer, dataStart);
        debugLog2(`SimpleBlock TrackNumber: ${blockTrackNo.value}, Opus TrackNumber: ${opusTrackNo}`);
        if (!isChunk && Number(blockTrackNo.value) !== opusTrackNo)
          break;
        const flags = buffer[dataStart + blockTrackNo.size + 2];
        const lacingType = (flags & 6) >> 1;
        debugLog2(`SimpleBlock lacing type: ${lacingType} ( ${LACING_TYPES[lacingType]})`);
        const blockDataStart = dataStart + blockTrackNo.size + 2 + 1;
        const blockDataEnd = dataEnd;
        const newFrames = processSimpleBlock(buffer.subarray(blockDataStart, blockDataEnd), lacingType);
        debugLog2(`Extracted ${newFrames.length} frames from SimpleBlock`);
        frames.push(...newFrames);
        break;
      // --- ANYTHING ELSE (Skip) ---
      default:
        debugLog2(`Skipping unrecognized element ID 0x${id.value.toString(16)} at offset ${offset}, size=${elementSize.value}${elementSize.isUnknown ? " (unknown size)" : ""}`);
        if (elementSize.isUnknown) {
          parentEnds.push(dataEnd);
        } else {
          offset = dataEnd;
        }
        break;
    }
  }
  debugLog2(`Total elements processed: ${elementsCount}`);
  if (opusTrackNo === -1) {
    debugLog2(`Warning: No Opus track found in WebM file.`);
  } else {
    debugLog2(`Opus track number: ${opusTrackNo}, channels: ${channels}, sampleRate: ${sampleRate}`);
    debugLog2(`Extracted ${frames.length} total Opus frames from WebM`);
  }
  return { frames, channels, sampleRate };
};

// src/common/audioTypes.ts
var AudioFormat = /* @__PURE__ */ ((AudioFormat2) => {
  AudioFormat2[AudioFormat2["OGG_OPUS"] = 0] = "OGG_OPUS";
  AudioFormat2[AudioFormat2["WEBM"] = 1] = "WEBM";
  AudioFormat2[AudioFormat2["UNKNOWN"] = 2] = "UNKNOWN";
  return AudioFormat2;
})(AudioFormat || {});

// src/common/formatDetection.ts
var detectFormat = (data) => {
  const oggStart = findOggStart(data);
  if (oggStart !== -1) {
    return 0 /* OGG_OPUS */;
  }
  if (data.length >= 4 && data[0] === 26 && data[1] === 69 && data[2] === 223 && data[3] === 163) {
    return 1 /* WEBM */;
  }
  return 2 /* UNKNOWN */;
};

// src/common/disassemble.ts
var debugLog3 = (...args) => debugger_default.debugLog("disassembler", ...args);
var disassembleOpusFile = (data, chunkFormat) => {
  const isChunk = chunkFormat !== void 0;
  const format = isChunk ? chunkFormat : detectFormat(data);
  debugLog3(`Detected format: ${AudioFormat[format]}`);
  switch (format) {
    case 0 /* OGG_OPUS */:
      return disassembleOgg(data, isChunk);
    case 1 /* WEBM */:
      return disassembleWebM(data, isChunk);
    case 2 /* UNKNOWN */:
      throw new Error("Unknown audio format (not Ogg Opus or WebM)");
  }
};

// src/ogg/oggCrc.ts
var makeCRCTable = () => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i << 24;
    for (let j = 0; j < 8; j++) {
      c = c & 2147483648 ? c << 1 ^ 79764919 : c << 1;
    }
    table[i] = c >>> 0;
  }
  return table;
};
var crcTable = makeCRCTable();
var calculateCRC = (data) => {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc = (crc << 8 ^ crcTable[(crc >>> 24 ^ data[i]) & 255]) >>> 0;
  }
  return crc;
};

// src/ogg/oggWrite.ts
var createMinimalOpusTagsPage = (serialNumber, pageSequence) => {
  const vendorString = "ogg-opus-concat";
  const vendorLength = vendorString.length;
  const bodySize = 8 + 4 + vendorLength + 4;
  const body = new Uint8Array(bodySize);
  let offset = 0;
  body.set(new TextEncoder().encode("OpusTags"), offset);
  offset += 8;
  body[offset++] = vendorLength & 255;
  body[offset++] = vendorLength >> 8 & 255;
  body[offset++] = vendorLength >> 16 & 255;
  body[offset++] = vendorLength >> 24 & 255;
  body.set(new TextEncoder().encode(vendorString), offset);
  offset += vendorLength;
  body[offset++] = 0;
  body[offset++] = 0;
  body[offset++] = 0;
  body[offset++] = 0;
  const segments = Math.ceil(bodySize / 255);
  const segmentTable = new Uint8Array(segments);
  for (let i = 0; i < segments - 1; i++) {
    segmentTable[i] = 255;
  }
  segmentTable[segments - 1] = bodySize % 255 || 255;
  const pageSize = 27 + segments + bodySize;
  const page = new Uint8Array(pageSize);
  const view = new DataView(page.buffer);
  page[0] = 79;
  page[1] = 103;
  page[2] = 103;
  page[3] = 83;
  page[4] = 0;
  page[5] = 0;
  view.setBigInt64(6, BigInt(0), true);
  view.setUint32(14, serialNumber, true);
  view.setUint32(18, pageSequence, true);
  view.setUint32(22, 0, true);
  page[26] = segments;
  page.set(segmentTable, 27);
  page.set(body, 27 + segments);
  const crc = calculateCRC(page);
  view.setUint32(22, crc, true);
  return page;
};
var createOpusHeadPage = (serialNumber, channels = 2, preskip = 312, sampleRate = 48e3) => {
  const body = new Uint8Array(19);
  const view = new DataView(body.buffer);
  let offset = 0;
  body.set(new TextEncoder().encode("OpusHead"), offset);
  offset += 8;
  body[offset++] = 1;
  body[offset++] = channels;
  view.setUint16(offset, preskip, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setInt16(offset, 0, true);
  offset += 2;
  body[offset++] = 0;
  return createOggPage({
    headerType: 2,
    // BOS (Beginning of Stream)
    granulePosition: BigInt(0),
    serialNumber,
    pageSequence: 0,
    body
  });
};
var createOggPage = (options) => {
  const { headerType, granulePosition, serialNumber, pageSequence, body } = options;
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
  const pageSize = 27 + segments + bodySize;
  const page = new Uint8Array(pageSize);
  const view = new DataView(page.buffer);
  page[0] = 79;
  page[1] = 103;
  page[2] = 103;
  page[3] = 83;
  page[4] = 0;
  page[5] = headerType;
  view.setBigInt64(6, granulePosition, true);
  view.setUint32(14, serialNumber, true);
  view.setUint32(18, pageSequence, true);
  view.setUint32(22, 0, true);
  page[26] = segments;
  page.set(segmentTable, 27);
  page.set(body, 27 + segments);
  const crc = calculateCRC(page);
  view.setUint32(22, crc, true);
  return page;
};

// src/ogg/oggAssemble.ts
var { debugLog: debugLog4 } = debugger_default;
var assembleOgg = (stream, options) => {
  const serialNumber = options?.serialNumber || stream.serialNumber || Math.floor(Math.random() * 4294967295);
  const includeHeaders = options?.includeHeaders === void 0 ? true : options?.includeHeaders;
  let pageSequence = options?.startingSequence === void 0 ? 0 : options?.startingSequence || 0;
  let granule = options?.startingGranule === void 0 ? BigInt(0) : options?.startingGranule || BigInt(0);
  const pages = [];
  let pageCount = 0;
  if (includeHeaders) {
    debugLog4(`Creating OpusHead: serial=${serialNumber}, channels=${stream.channels}, preskip=${stream.preskip}, sampleRate=${stream.sampleRate}`);
    pages.push(createOpusHeadPage(serialNumber, stream.channels, stream.preskip, stream.sampleRate));
    pageSequence++;
    pageCount++;
    debugLog4(`Creating minimal OpusTags: sequence=${pageSequence}`);
    pages.push(createMinimalOpusTagsPage(serialNumber, pageSequence));
    pageSequence++;
    pageCount++;
  } else {
    debugLog4(`Assembling data pages only (no headers), starting at sequence=${pageSequence}, granule=${granule}`);
  }
  const MAX_PAGE_SIZE = 4e3;
  let currentPageData = [];
  let currentPageSize = 0;
  let currentPageSamples = 0;
  for (const frame of stream.frames) {
    if (currentPageSize + frame.data.length > MAX_PAGE_SIZE && currentPageData.length > 0) {
      const pageBody = new Uint8Array(currentPageSize);
      debugLog4(`Flushing page: sequence=${pageSequence}, granule=${granule}, size=${pageBody.length}, packets=${currentPageData.length}`);
      let offset = 0;
      for (const d of currentPageData) {
        pageBody.set(d, offset);
        offset += d.length;
      }
      granule += BigInt(currentPageSamples);
      const page = createOggPage({
        headerType: 0,
        granulePosition: granule,
        serialNumber,
        pageSequence,
        body: pageBody
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
  if (currentPageData.length > 0) {
    const pageBody = new Uint8Array(currentPageSize);
    let offset = 0;
    for (const d of currentPageData) {
      pageBody.set(d, offset);
      offset += d.length;
    }
    granule += BigInt(currentPageSamples);
    const page = createOggPage({
      headerType: 0,
      granulePosition: granule,
      serialNumber,
      pageSequence,
      body: pageBody
    });
    pages.push(page);
    pageCount++;
  }
  const totalSize = pages.reduce((sum, p) => sum + p.length, 0);
  const data = new Uint8Array(totalSize);
  let resultOffset = 0;
  for (const page of pages) {
    data.set(page, resultOffset);
    resultOffset += page.length;
  }
  debugLog4(`Assembled ${pageCount} pages, final granule: ${granule}, total size: ${data.length} bytes`);
  return { data, pageCount, finalGranule: granule };
};

// src/index.ts
var setDebug = (enabled) => {
  debugger_default.isDebug = enabled;
};
var setDebugCategories = (categories) => debugger_default.enabledCategories = new Set(categories);
var setCustomDebugLogger = (logger) => {
  debugger_default.customLogger = logger;
};
var debugLog5 = (...args) => debugger_default.debugLog("index", ...args);
var concatChunks = (chunks) => {
  if (chunks.length === 0) {
    throw new Error("No chunks provided");
  }
  debugLog5(`
=== Concatenating ${chunks.length} chunks ===`);
  let { result, meta } = prepareAccumulator(chunks[0]);
  debugLog5(`First chunk prepared: ${result.length} bytes, granule=${meta.cumulativeGranule}`);
  if (chunks.length === 1) {
    return result;
  }
  ({ result } = appendToAccumulator(result, chunks.slice(1), meta));
  debugLog5(`Final result: ${result.length} bytes
`);
  return result;
};
var prepareAccumulator = (data) => {
  debugLog5(`
=== Preparing accumulator from ${data.length} byte file ===`);
  const stream = disassembleOpusFile(data);
  const { data: result } = assembleOgg(stream, { includeHeaders: true });
  const oggStart = findOggStart(result);
  let offset = oggStart;
  let lastPageSequence = 0;
  let maxGranule = BigInt(0);
  let serialNumber = stream.serialNumber || 0;
  while (offset < result.length) {
    const page = parseOggPage(result, offset);
    if (!page) break;
    if (serialNumber === 0) serialNumber = page.serialNumber;
    lastPageSequence = page.pageSequence;
    if (page.granulePosition > maxGranule) {
      maxGranule = page.granulePosition;
    }
    offset += page.pageSize;
  }
  debugLog5(`Prepared accumulator: serial=${serialNumber}, lastSeq=${lastPageSequence}, granule=${maxGranule}, size=${result.length}`);
  return {
    result,
    meta: {
      serialNumber,
      lastPageSequence,
      cumulativeGranule: maxGranule,
      totalSize: result.length
    }
  };
};
var appendToAccumulator = (acc, files, accMeta, chunkFormat) => {
  debugLog5(`
=== Appending ${files.length} chunks to accumulator ===`);
  debugLog5(`Starting state: seq=${accMeta.lastPageSequence}, granule=${accMeta.cumulativeGranule}, size=${accMeta.totalSize}`);
  const dataPages = [];
  let pageSequence = accMeta.lastPageSequence + 1;
  let granule = accMeta.cumulativeGranule;
  for (let i = 0; i < files.length; i++) {
    const chunk = files[i];
    debugLog5(`
--- Processing chunk ${i + 1}/${files.length} (${chunk.length} bytes) ---`);
    const stream = disassembleOpusFile(chunk, chunkFormat);
    const { data: chunkData, pageCount, finalGranule } = assembleOgg(stream, {
      serialNumber: accMeta.serialNumber,
      startingSequence: pageSequence,
      startingGranule: granule,
      includeHeaders: false
    });
    dataPages.push(chunkData);
    granule = finalGranule;
    pageSequence += pageCount;
    debugLog5(`Chunk assembled: ${pageCount} pages, granule advanced to ${finalGranule}`);
  }
  const totalSize = acc.length + dataPages.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalSize);
  result.set(acc, 0);
  let offset = acc.length;
  for (const page of dataPages) {
    result.set(page, offset);
    offset += page.length;
  }
  debugLog5(`
Final state: seq=${pageSequence - 1}, granule=${granule}, total size=${result.length}`);
  return {
    result,
    meta: {
      serialNumber: accMeta.serialNumber,
      lastPageSequence: pageSequence - 1,
      cumulativeGranule: granule,
      totalSize: result.length
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  appendToAccumulator,
  concatChunks,
  prepareAccumulator,
  setCustomDebugLogger,
  setDebug,
  setDebugCategories
});
//# sourceMappingURL=index.cjs.map