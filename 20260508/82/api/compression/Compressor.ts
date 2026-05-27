import pako from 'pako';
import type { FrameData } from '../../shared/types.js';

export class Compressor {
  private previousPositions: Float32Array | null = null;
  private atomCount: number;

  constructor(atomCount: number) {
    this.atomCount = atomCount;
  }

  public encodeFrame(frameData: FrameData, useDelta: boolean = true): Uint8Array {
    const headerSize = 20;
    const positionCount = this.atomCount * 3;
    const dataSize = headerSize + positionCount * 4;

    const buffer = new ArrayBuffer(dataSize);
    const view = new DataView(buffer);

    view.setUint32(0, frameData.frame, true);
    view.setFloat32(4, frameData.time, true);
    view.setFloat32(8, frameData.temperature, true);
    view.setFloat32(12, frameData.potentialEnergy, true);
    view.setFloat32(16, frameData.kineticEnergy, true);

    let positionsToWrite = frameData.positions;

    if (useDelta && this.previousPositions) {
      const delta = new Float32Array(positionCount);
      for (let i = 0; i < positionCount; i++) {
        delta[i] = frameData.positions[i] - this.previousPositions[i];
      }
      positionsToWrite = delta;
    }

    for (let i = 0; i < positionCount; i++) {
      view.setFloat32(headerSize + i * 4, positionsToWrite[i], true);
    }

    this.previousPositions = new Float32Array(frameData.positions);

    return new Uint8Array(buffer);
  }

  public compress(data: Uint8Array): Uint8Array {
    return pako.deflate(data);
  }

  public static compress(data: Uint8Array): Uint8Array {
    return pako.deflate(data);
  }

  public createBinaryMessage(
    type: number,
    compressedData: Uint8Array,
    originalSize: number
  ): Uint8Array {
    const headerSize = 9;
    const message = new Uint8Array(headerSize + compressedData.length);

    message[0] = type;

    const view = new DataView(message.buffer);
    view.setUint32(1, originalSize, true);
    view.setUint32(5, compressedData.length, true);

    message.set(compressedData, headerSize);

    return message;
  }

  public compressFrame(frameData: FrameData, useDelta: boolean = true): {
    message: Uint8Array;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  } {
    const encoded = this.encodeFrame(frameData, useDelta);
    const compressed = this.compress(encoded);
    const message = this.createBinaryMessage(0x02, compressed, encoded.length);

    return {
      message,
      originalSize: encoded.length,
      compressedSize: compressed.length,
      compressionRatio: encoded.length > 0 ? (1 - compressed.length / encoded.length) * 100 : 0,
    };
  }

  public reset(): void {
    this.previousPositions = null;
  }

  public static decompress(compressedData: Uint8Array): Uint8Array {
    return pako.inflate(compressedData);
  }

  public static decodeFrame(
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

  public static parseBinaryMessage(message: Uint8Array): {
    type: number;
    originalSize: number;
    compressedSize: number;
    data: Uint8Array;
  } {
    if (message.length < 9) {
      throw new Error('Message too short');
    }

    const view = new DataView(message.buffer, message.byteOffset, message.byteLength);
    const type = message[0];
    const originalSize = view.getUint32(1, true);
    const compressedSize = view.getUint32(5, true);
    const data = message.slice(9);

    return { type, originalSize, compressedSize, data };
  }
}

export default Compressor;
