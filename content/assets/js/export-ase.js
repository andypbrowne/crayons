const FILE_SIGNATURE = "ASEF";
const FORMAT_VERSION = 0x00010000;
const COLOR_BLOCK = 0x0001;
const COLOR_TYPE_NORMAL = 0x0002;

function writeUint16BE(view, offset, value) {
  view.setUint16(offset, value, false);
}

function writeUint32BE(view, offset, value) {
  view.setUint32(offset, value, false);
}

function writeFloat32BE(view, offset, value) {
  view.setFloat32(offset, value, false);
}

function encodeUtf16BeName(name) {
  const safeName = String(name || "Color");
  const charCount = safeName.length + 1;
  const bytes = new Uint8Array(2 + safeName.length * 2 + 2);
  const view = new DataView(bytes.buffer);
  writeUint16BE(view, 0, charCount);

  let offset = 2;
  for (let index = 0; index < safeName.length; index += 1) {
    writeUint16BE(view, offset, safeName.charCodeAt(index));
    offset += 2;
  }
  writeUint16BE(view, offset, 0);
  return bytes;
}

function encodeColorBlock({ name, rgb }) {
  const nameBytes = encodeUtf16BeName(name);
  const blockBody = new Uint8Array(
    nameBytes.length + 4 + 12 + 2,
  );
  const view = new DataView(blockBody.buffer);
  let offset = 0;

  blockBody.set(nameBytes, offset);
  offset += nameBytes.length;

  blockBody.set([0x52, 0x47, 0x42, 0x20], offset);
  offset += 4;

  writeFloat32BE(view, offset, rgb.r / 255);
  offset += 4;
  writeFloat32BE(view, offset, rgb.g / 255);
  offset += 4;
  writeFloat32BE(view, offset, rgb.b / 255);
  offset += 4;

  writeUint16BE(view, offset, COLOR_TYPE_NORMAL);

  const block = new Uint8Array(6 + blockBody.length);
  const blockView = new DataView(block.buffer);
  writeUint16BE(blockView, 0, COLOR_BLOCK);
  writeUint32BE(blockView, 2, blockBody.length);
  block.set(blockBody, 6);
  return block;
}

export function encodeAse(entries) {
  const colorBlocks = entries.map((entry) => encodeColorBlock(entry));
  const bodyLength = colorBlocks.reduce((sum, block) => sum + block.length, 0);
  const output = new Uint8Array(12 + bodyLength);
  const view = new DataView(output.buffer);

  for (let index = 0; index < FILE_SIGNATURE.length; index += 1) {
    output[index] = FILE_SIGNATURE.charCodeAt(index);
  }

  writeUint32BE(view, 4, FORMAT_VERSION);
  writeUint32BE(view, 8, entries.length);

  let offset = 12;
  colorBlocks.forEach((block) => {
    output.set(block, offset);
    offset += block.length;
  });

  return output;
}
