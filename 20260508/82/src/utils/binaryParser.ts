import pako from 'pako';
import type { FrameData, MetaMessage } from '../../shared/types.js';
import { MESSAGE_TYPE } from '../../shared/types.js';

export interface ParsedBinaryMessage {
  type: number;
  originalSize: number;
  compressedSize: number;
  data: Uint8Array;
  compressionRatio: number;
}

export function parseBinaryMessage(message: ArrayBuffer): ParsedBinaryMessage {
  const uint8Data = new Uint8Array(message);

  if (uint8Data.length < 9) {
    throw new Error('Message too short');
  }

  const view = new DataView(uint8Data.buffer, uint8Data.byteOffset, uint8Data.byteLength);
  const type = uint8Data[0];
  const originalSize = view.getUint32(1, true);
  const compressedSize = view.getUint32(5, true);
  const data = uint8Data.slice(9);

  const compressionRatio = originalSize > 0 ? (1 - compressedSize / originalSize) * 100 : 0;

  return { type, originalSize, compressedSize, data, compressionRatio };
}

export function decompressData(compressedData: Uint8Array): Uint8Array {
  return pako.inflate(compressedData);
}

export function decodeMeta(decompressedData: Uint8Array): MetaMessage {
  const jsonStr = new TextDecoder('utf-8').decode(decompressedData);
  return JSON.parse(jsonStr) as MetaMessage;
}

export function decodeFrame(
  data: Uint8Array,
  atomCount: number,
  previousPositions: Float32Array | null,
  isDelta: boolean = true
): { frameData: FrameData; positions: Float32Array } {
  const headerSize = 20;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const frame = view.getUint32(0, true);
  const time = view.getFloat32(4, true);
  const temperature = view.getFloat32(8, true);
  const potentialEnergy = view.getFloat32(12, true);
  const kineticEnergy = view.getFloat32(16, true);

  const positionCount = atomCount * 3;
  const positions = new Float32Array(positionCount);

  for (let i = 0; i < positionCount; i++) {
    positions[i] = view.getFloat32(headerSize + i * 4, true);
  }

  let absolutePositions = positions;

  if (isDelta && previousPositions) {
    absolutePositions = new Float32Array(positionCount);
    for (let i = 0; i < positionCount; i++) {
      absolutePositions[i] = previousPositions[i] + positions[i];
    }
  }

  return {
    frameData: {
      frame,
      time,
      temperature,
      potentialEnergy,
      kineticEnergy,
      positions: absolutePositions,
    },
    positions: absolutePositions,
  };
}

export function processMessage(
  message: ArrayBuffer,
  atomCount: number,
  previousPositions: Float32Array | null
): {
  type: 'meta' | 'frame' | 'error';
  meta?: MetaMessage;
  frame?: FrameData;
  positions?: Float32Array;
  compressionRatio: number;
  originalSize: number;
  compressedSize: number;
} | null {
  try {
    const parsed = parseBinaryMessage(message);
    const decompressed = decompressData(parsed.data);

    if (parsed.type === MESSAGE_TYPE.META) {
      const meta = decodeMeta(decompressed);
      return {
        type: 'meta',
        meta,
        compressionRatio: parsed.compressionRatio,
        originalSize: parsed.originalSize,
        compressedSize: parsed.compressedSize,
      };
    }

    if (parsed.type === MESSAGE_TYPE.FRAME) {
      const isKeyFrame = previousPositions === null;
      const { frameData, positions } = decodeFrame(
        decompressed,
        atomCount,
        previousPositions,
        !isKeyFrame
      );
      return {
        type: 'frame',
        frame: frameData,
        positions,
        compressionRatio: parsed.compressionRatio,
        originalSize: parsed.originalSize,
        compressedSize: parsed.compressedSize,
      };
    }

    if (parsed.type === MESSAGE_TYPE.ERROR) {
      return {
        type: 'error',
        compressionRatio: parsed.compressionRatio,
        originalSize: parsed.originalSize,
        compressedSize: parsed.compressedSize,
      };
    }

    return null;
  } catch (error) {
    console.error('Error processing message:', error);
    return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
