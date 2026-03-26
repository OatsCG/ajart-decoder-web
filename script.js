const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
]);

const SBOX = [
  0x63,0x7C,0x77,0x7B,0xF2,0x6B,0x6F,0xC5,0x30,0x01,0x67,0x2B,0xFE,0xD7,0xAB,0x76,
  0xCA,0x82,0xC9,0x7D,0xFA,0x59,0x47,0xF0,0xAD,0xD4,0xA2,0xAF,0x9C,0xA4,0x72,0xC0,
  0xB7,0xFD,0x93,0x26,0x36,0x3F,0xF7,0xCC,0x34,0xA5,0xE5,0xF1,0x71,0xD8,0x31,0x15,
  0x04,0xC7,0x23,0xC3,0x18,0x96,0x05,0x9A,0x07,0x12,0x80,0xE2,0xEB,0x27,0xB2,0x75,
  0x09,0x83,0x2C,0x1A,0x1B,0x6E,0x5A,0xA0,0x52,0x3B,0xD6,0xB3,0x29,0xE3,0x2F,0x84,
  0x53,0xD1,0x00,0xED,0x20,0xFC,0xB1,0x5B,0x6A,0xCB,0xBE,0x39,0x4A,0x4C,0x58,0xCF,
  0xD0,0xEF,0xAA,0xFB,0x43,0x4D,0x33,0x85,0x45,0xF9,0x02,0x7F,0x50,0x3C,0x9F,0xA8,
  0x51,0xA3,0x40,0x8F,0x92,0x9D,0x38,0xF5,0xBC,0xB6,0xDA,0x21,0x10,0xFF,0xF3,0xD2,
  0xCD,0x0C,0x13,0xEC,0x5F,0x97,0x44,0x17,0xC4,0xA7,0x7E,0x3D,0x64,0x5D,0x19,0x73,
  0x60,0x81,0x4F,0xDC,0x22,0x2A,0x90,0x88,0x46,0xEE,0xB8,0x14,0xDE,0x5E,0x0B,0xDB,
  0xE0,0x32,0x3A,0x0A,0x49,0x06,0x24,0x5C,0xC2,0xD3,0xAC,0x62,0x91,0x95,0xE4,0x79,
  0xE7,0xC8,0x37,0x6D,0x8D,0xD5,0x4E,0xA9,0x6C,0x56,0xF4,0xEA,0x65,0x7A,0xAE,0x08,
  0xBA,0x78,0x25,0x2E,0x1C,0xA6,0xB4,0xC6,0xE8,0xDD,0x74,0x1F,0x4B,0xBD,0x8B,0x8A,
  0x70,0x3E,0xB5,0x66,0x48,0x03,0xF6,0x0E,0x61,0x35,0x57,0xB9,0x86,0xC1,0x1D,0x9E,
  0xE1,0xF8,0x98,0x11,0x69,0xD9,0x8E,0x94,0x9B,0x1E,0x87,0xE9,0xCE,0x55,0x28,0xDF,
  0x8C,0xA1,0x89,0x0D,0xBF,0xE6,0x42,0x68,0x41,0x99,0x2D,0x0F,0xB0,0x54,0xBB,0x16
];

const INV_SBOX = (() => {
  const table = new Array(256).fill(0);
  for (let i = 0; i < SBOX.length; i += 1) {
    table[SBOX[i]] = i;
  }
  return table;
})();

const RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1B, 0x36];

const decoderTabButton = document.getElementById("decoderTabButton");
const encoderTabButton = document.getElementById("encoderTabButton");
const decoderPanel = document.getElementById("decoderPanel");
const encoderPanel = document.getElementById("encoderPanel");

const decodeFileInput = document.getElementById("decodeFileInput");
const decodeUuidInput = document.getElementById("decodeUuidInput");
const decodeButton = document.getElementById("decodeButton");
const decodeStatus = document.getElementById("decodeStatus");
const decodePreviewSection = document.getElementById("decodePreviewSection");
const decodePreviewImage = document.getElementById("decodePreviewImage");
const decodeDownloadButton = document.getElementById("decodeDownloadButton");

const encodeFileInput = document.getElementById("encodeFileInput");
const encodeUuidInput = document.getElementById("encodeUuidInput");
const encodeButton = document.getElementById("encodeButton");
const encodeStatus = document.getElementById("encodeStatus");
const encodePreviewSection = document.getElementById("encodePreviewSection");
const encodePreviewImage = document.getElementById("encodePreviewImage");
const encodeDownloadButton = document.getElementById("encodeDownloadButton");

let decodeObjectUrl = null;
let encodePreviewObjectUrl = null;
let encodeDownloadObjectUrl = null;

function showTab(tabName) {
  const isDecoder = tabName === "decoder";

  decoderTabButton.classList.toggle("active", isDecoder);
  encoderTabButton.classList.toggle("active", !isDecoder);
  decoderPanel.hidden = !isDecoder;
  encoderPanel.hidden = isDecoder;
}

decoderTabButton.addEventListener("click", () => showTab("decoder"));
encoderTabButton.addEventListener("click", () => showTab("encoder"));

function setStatus(element, message, type) {
  element.textContent = message;
  element.className = "status " + (type || "info");
}

function revokeObjectUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

function clearDecodePreview() {
  decodePreviewSection.hidden = true;
  decodePreviewImage.removeAttribute("src");
  decodeDownloadButton.removeAttribute("href");
  revokeObjectUrl(decodeObjectUrl);
  decodeObjectUrl = null;
}

function clearEncodePreview() {
  encodePreviewSection.hidden = true;
  encodePreviewImage.removeAttribute("src");
  encodeDownloadButton.removeAttribute("href");
  revokeObjectUrl(encodePreviewObjectUrl);
  revokeObjectUrl(encodeDownloadObjectUrl);
  encodePreviewObjectUrl = null;
  encodeDownloadObjectUrl = null;
}

function parseUuid(uuidString) {
  if (uuidString.length !== 36) {
    throw new Error("UUID must be 36 characters long.");
  }

  const key = [];
  const iv = [];
  let index = 0;

  while (key.length < 16) {
    key.push(uuidString.charCodeAt(index) & 0xFF);
    index += 1;
    iv.push(uuidString.charCodeAt(index) & 0xFF);
    index += 1;
  }

  return {
    key: new Uint8Array(key),
    iv: new Uint8Array(iv)
  };
}

function xtime(value) {
  return (value & 0x80)
    ? (((value << 1) ^ 0x1B) & 0xFF)
    : ((value << 1) & 0xFF);
}

function gfMul(a, b) {
  let result = 0;
  let left = a & 0xFF;
  let right = b & 0xFF;

  while (right) {
    if (right & 1) {
      result ^= left;
    }
    left = xtime(left);
    right >>= 1;
  }

  return result & 0xFF;
}

function rotWord(word) {
  return [word[1], word[2], word[3], word[0]];
}

function subWord(word) {
  return word.map((byte) => SBOX[byte]);
}

function expandKey128(key) {
  if (key.length !== 16) {
    throw new Error("AES-128 requires a 16-byte key.");
  }

  const nk = 4;
  const nb = 4;
  const nr = 10;
  const words = [];

  for (let i = 0; i < 16; i += 4) {
    words.push([key[i], key[i + 1], key[i + 2], key[i + 3]]);
  }

  for (let i = nk; i < nb * (nr + 1); i += 1) {
    let temp = words[i - 1].slice();

    if (i % nk === 0) {
      temp = subWord(rotWord(temp));
      temp[0] ^= RCON[Math.floor(i / nk)];
    }

    words.push([
      words[i - nk][0] ^ temp[0],
      words[i - nk][1] ^ temp[1],
      words[i - nk][2] ^ temp[2],
      words[i - nk][3] ^ temp[3]
    ]);
  }

  const roundKeys = [];
  for (let round = 0; round <= nr; round += 1) {
    const roundKey = [];
    for (let col = 0; col < 4; col += 1) {
      roundKey.push(
        words[round * 4 + col][0],
        words[round * 4 + col][1],
        words[round * 4 + col][2],
        words[round * 4 + col][3]
      );
    }
    roundKeys.push(roundKey);
  }

  return roundKeys;
}

function addRoundKey(state, roundKey) {
  for (let i = 0; i < 16; i += 1) {
    state[i] ^= roundKey[i];
  }
}

function subBytes(state) {
  for (let i = 0; i < 16; i += 1) {
    state[i] = SBOX[state[i]];
  }
}

function invSubBytes(state) {
  for (let i = 0; i < 16; i += 1) {
    state[i] = INV_SBOX[state[i]];
  }
}

function shiftRows(state) {
  let temp = state[1];
  state[1] = state[5];
  state[5] = state[9];
  state[9] = state[13];
  state[13] = temp;

  temp = state[2];
  const temp2 = state[6];
  state[2] = state[10];
  state[6] = state[14];
  state[10] = temp;
  state[14] = temp2;

  temp = state[3];
  state[3] = state[15];
  state[15] = state[11];
  state[11] = state[7];
  state[7] = temp;
}

function invShiftRows(state) {
  let temp = state[1];
  state[1] = state[13];
  state[13] = state[9];
  state[9] = state[5];
  state[5] = temp;

  temp = state[2];
  const temp2 = state[6];
  state[2] = state[10];
  state[6] = state[14];
  state[10] = temp;
  state[14] = temp2;

  temp = state[3];
  state[3] = state[7];
  state[7] = state[11];
  state[11] = state[15];
  state[15] = temp;
}

function mixColumns(state) {
  for (let column = 0; column < 4; column += 1) {
    const i = column * 4;
    const a0 = state[i + 0];
    const a1 = state[i + 1];
    const a2 = state[i + 2];
    const a3 = state[i + 3];

    state[i + 0] = gfMul(a0, 2) ^ gfMul(a1, 3) ^ a2 ^ a3;
    state[i + 1] = a0 ^ gfMul(a1, 2) ^ gfMul(a2, 3) ^ a3;
    state[i + 2] = a0 ^ a1 ^ gfMul(a2, 2) ^ gfMul(a3, 3);
    state[i + 3] = gfMul(a0, 3) ^ a1 ^ a2 ^ gfMul(a3, 2);
  }
}

function invMixColumns(state) {
  for (let column = 0; column < 4; column += 1) {
    const i = column * 4;
    const a0 = state[i + 0];
    const a1 = state[i + 1];
    const a2 = state[i + 2];
    const a3 = state[i + 3];

    state[i + 0] = gfMul(a0, 14) ^ gfMul(a1, 11) ^ gfMul(a2, 13) ^ gfMul(a3, 9);
    state[i + 1] = gfMul(a0, 9) ^ gfMul(a1, 14) ^ gfMul(a2, 11) ^ gfMul(a3, 13);
    state[i + 2] = gfMul(a0, 13) ^ gfMul(a1, 9) ^ gfMul(a2, 14) ^ gfMul(a3, 11);
    state[i + 3] = gfMul(a0, 11) ^ gfMul(a1, 13) ^ gfMul(a2, 9) ^ gfMul(a3, 14);
  }
}

function aes128EncryptBlock(block, roundKeys) {
  if (block.length !== 16) {
    throw new Error("AES block must be exactly 16 bytes.");
  }

  const state = Array.from(block);
  addRoundKey(state, roundKeys[0]);

  for (let round = 1; round < 10; round += 1) {
    subBytes(state);
    shiftRows(state);
    mixColumns(state);
    addRoundKey(state, roundKeys[round]);
  }

  subBytes(state);
  shiftRows(state);
  addRoundKey(state, roundKeys[10]);

  return new Uint8Array(state);
}

function aes128DecryptBlock(block, roundKeys) {
  if (block.length !== 16) {
    throw new Error("AES block must be exactly 16 bytes.");
  }

  const state = Array.from(block);
  addRoundKey(state, roundKeys[10]);

  for (let round = 9; round > 0; round -= 1) {
    invShiftRows(state);
    invSubBytes(state);
    addRoundKey(state, roundKeys[round]);
    invMixColumns(state);
  }

  invShiftRows(state);
  invSubBytes(state);
  addRoundKey(state, roundKeys[0]);

  return new Uint8Array(state);
}

function padToBlockSize(data, blockSize) {
  const remainder = data.length % blockSize;
  if (remainder === 0) {
    return data;
  }

  const padded = new Uint8Array(data.length + (blockSize - remainder));
  padded.set(data, 0);
  return padded;
}

function encryptAesCbc(key, iv, plaintext) {
  if (key.length !== 16) {
    throw new Error("AES-128 key must be 16 bytes.");
  }
  if (iv.length !== 16) {
    throw new Error("AES CBC IV must be 16 bytes.");
  }

  const paddedPlaintext = padToBlockSize(plaintext, 16);
  const roundKeys = expandKey128(key);
  const ciphertext = new Uint8Array(paddedPlaintext.length);
  let previousBlock = iv;

  for (let offset = 0; offset < paddedPlaintext.length; offset += 16) {
    const block = paddedPlaintext.slice(offset, offset + 16);
    const xored = new Uint8Array(16);

    for (let i = 0; i < 16; i += 1) {
      xored[i] = block[i] ^ previousBlock[i];
    }

    const encryptedBlock = aes128EncryptBlock(xored, roundKeys);
    ciphertext.set(encryptedBlock, offset);
    previousBlock = encryptedBlock;
  }

  return ciphertext;
}

function decryptAesCbc(key, iv, ciphertext) {
  if (key.length !== 16) {
    throw new Error("AES-128 key must be 16 bytes.");
  }
  if (iv.length !== 16) {
    throw new Error("AES CBC IV must be 16 bytes.");
  }
  if (ciphertext.length % 16 !== 0) {
    throw new Error("Ciphertext length must be a multiple of 16 bytes.");
  }

  const roundKeys = expandKey128(key);
  const plaintext = new Uint8Array(ciphertext.length);
  let previousBlock = iv;

  for (let offset = 0; offset < ciphertext.length; offset += 16) {
    const block = ciphertext.slice(offset, offset + 16);
    const decryptedBlock = aes128DecryptBlock(block, roundKeys);

    for (let i = 0; i < 16; i += 1) {
      plaintext[offset + i] = decryptedBlock[i] ^ previousBlock[i];
    }

    previousBlock = block;
  }

  return plaintext;
}

async function decompressWithStream(format, data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream(format));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function decompressZlib(data) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser does not support DecompressionStream.");
  }

  const errors = [];

  async function attempt(label, callback) {
    try {
      return await callback();
    } catch (error) {
      errors.push(label + ": " + error.message);
      return null;
    }
  }

  let output = await attempt("zlib", () => decompressWithStream("deflate", data));
  if (output) {
    return output;
  }

  for (let trim = 1; trim <= Math.min(256, data.length - 2); trim += 1) {
    output = await attempt("zlib trim " + trim, () =>
      decompressWithStream("deflate", data.slice(0, data.length - trim))
    );
    if (output) {
      return output;
    }
  }

  output = await attempt("raw deflate", () => decompressWithStream("deflate-raw", data));
  if (output) {
    return output;
  }

  for (let trim = 1; trim <= Math.min(256, data.length - 2); trim += 1) {
    output = await attempt("raw deflate trim " + trim, () =>
      decompressWithStream("deflate-raw", data.slice(0, data.length - trim))
    );
    if (output) {
      return output;
    }
  }

  throw new Error("zlib decompression failed. " + errors.join(" | "));
}

async function compressZlib(data) {
  if (typeof CompressionStream === "undefined") {
    throw new Error("This browser does not support CompressionStream.");
  }

  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("deflate"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

function findPngStart(data) {
  for (let start = 0; start <= data.length - PNG_SIGNATURE.length; start += 1) {
    let match = true;

    for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
      if (data[start + i] !== PNG_SIGNATURE[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return start;
    }
  }

  return -1;
}

function extractPngFromAmf3(data) {
  if (data.length < 1 || data[0] !== 0x0A) {
    return data;
  }

  const pngStart = findPngStart(data);
  if (pngStart !== -1) {
    return data.slice(pngStart);
  }

  return data;
}

function concatBytes(parts) {
  let totalLength = 0;
  for (const part of parts) {
    totalLength += part.length;
  }

  const out = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }

  return out;
}

function asciiBytes(text) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i) & 0xFF;
  }
  return bytes;
}

function utf8Bytes(text) {
  return new TextEncoder().encode(text);
}

function encodeU29(value) {
  if (value < 0 || value > 0x1FFFFFFF) {
    throw new Error("AMF3 U29 value out of range.");
  }

  if (value < 0x80) {
    return new Uint8Array([value]);
  }

  if (value < 0x4000) {
    return new Uint8Array([
      ((value >> 7) & 0x7F) | 0x80,
      value & 0x7F
    ]);
  }

  if (value < 0x200000) {
    return new Uint8Array([
      ((value >> 14) & 0x7F) | 0x80,
      ((value >> 7) & 0x7F) | 0x80,
      value & 0x7F
    ]);
  }

  return new Uint8Array([
    ((value >> 22) & 0x7F) | 0x80,
    ((value >> 15) & 0x7F) | 0x80,
    ((value >> 8) & 0x7F) | 0x80,
    value & 0xFF
  ]);
}

function amf3StringNoMarker(text) {
  if (text.length === 0) {
    return new Uint8Array([0x01]);
  }

  const bytes = utf8Bytes(text);
  const header = encodeU29((bytes.length << 1) | 1);
  return concatBytes([header, bytes]);
}

function amf3StringValue(text) {
  return concatBytes([
    new Uint8Array([0x06]),
    amf3StringNoMarker(text)
  ]);
}

function amf3ByteArrayValue(bytes) {
  const header = encodeU29((bytes.length << 1) | 1);
  return concatBytes([
    new Uint8Array([0x0C]),
    header,
    bytes
  ]);
}

function buildAjartAmf3(uuidString, pngBytes) {
  return concatBytes([
    new Uint8Array([0x0A]),      // object marker
    new Uint8Array([0x0B]),      // inline object, inline traits, dynamic, 0 sealed members
    new Uint8Array([0x01]),      // empty class name

    amf3StringNoMarker("h"),
    amf3StringValue("ajg1id"),

    amf3StringNoMarker("p"),
    amf3StringValue(uuidString),

    amf3StringNoMarker("b"),
    amf3ByteArrayValue(pngBytes),

    new Uint8Array([0x01])       // end of dynamic members
  ]);
}

async function decodeAjart(file, uuidString) {
  const { key, iv } = parseUuid(uuidString.trim());
  const encryptedBytes = new Uint8Array(await file.arrayBuffer());
  const decryptedBytes = decryptAesCbc(key, iv, encryptedBytes);
  const decompressedBytes = await decompressZlib(decryptedBytes);
  return extractPngFromAmf3(decompressedBytes);
}

async function encodeAjart(file, uuidString) {
  const trimmedUuid = uuidString.trim();
  const { key, iv } = parseUuid(trimmedUuid);
  const pngBytes = new Uint8Array(await file.arrayBuffer());

  const pngStart = findPngStart(pngBytes);
  if (pngStart !== 0) {
    throw new Error("Selected file does not look like a PNG.");
  }

  const amf3Bytes = buildAjartAmf3(trimmedUuid, pngBytes);
  const compressedBytes = await compressZlib(amf3Bytes);
  const encryptedBytes = encryptAesCbc(key, iv, compressedBytes);

  return {
    ajartBytes: encryptedBytes,
    pngBytes: pngBytes
  };
}

async function handleDecode() {
  clearDecodePreview();

  const file = decodeFileInput.files[0];
  const uuid = decodeUuidInput.value;

  if (!file) {
    setStatus(decodeStatus, "Choose an .ajart file first.", "error");
    return;
  }

  if (!uuid.trim()) {
    setStatus(decodeStatus, "Enter a UUID first.", "error");
    return;
  }

  try {
    setStatus(decodeStatus, "Decoding…", "info");

    const pngBytes = await decodeAjart(file, uuid);
    const blob = new Blob([pngBytes], { type: "image/png" });

    decodeObjectUrl = URL.createObjectURL(blob);
    decodePreviewImage.src = decodeObjectUrl;
    decodeDownloadButton.href = decodeObjectUrl;
    decodePreviewSection.hidden = false;

    setStatus(decodeStatus, "Decoded successfully.", "success");
  } catch (error) {
    console.error(error);
    setStatus(decodeStatus, "Error: " + error.message, "error");
  }
}

async function handleEncode() {
  clearEncodePreview();

  const file = encodeFileInput.files[0];
  const uuid = encodeUuidInput.value;

  if (!file) {
    setStatus(encodeStatus, "Choose a PNG file first.", "error");
    return;
  }

  if (!uuid.trim()) {
    setStatus(encodeStatus, "Enter a UUID first.", "error");
    return;
  }

  try {
    setStatus(encodeStatus, "Encoding…", "info");

    const result = await encodeAjart(file, uuid);

    encodePreviewObjectUrl = URL.createObjectURL(
      new Blob([result.pngBytes], { type: "image/png" })
    );
    encodeDownloadObjectUrl = URL.createObjectURL(
      new Blob([result.ajartBytes], { type: "application/octet-stream" })
    );

    encodePreviewImage.src = encodePreviewObjectUrl;
    encodeDownloadButton.href = encodeDownloadObjectUrl;
    encodePreviewSection.hidden = false;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "encoded";
    encodeDownloadButton.download = baseName + ".ajart";

    setStatus(encodeStatus, "Encoded successfully.", "success");
  } catch (error) {
    console.error(error);
    setStatus(encodeStatus, "Error: " + error.message, "error");
  }
}

decodeButton.addEventListener("click", handleDecode);
encodeButton.addEventListener("click", handleEncode);

decodeUuidInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleDecode();
  }
});

encodeUuidInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleEncode();
  }
});