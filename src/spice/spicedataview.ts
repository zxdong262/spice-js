/*
   Copyright (C) 2012 by Jeremy P. White <jwhite@codeweavers.com>

   This file is part of spice-html5.

   spice-html5 is free software: you can redistribute it and/or modify
   it under the terms of the GNU Lesser General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   spice-html5 is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Lesser General Public License for more details.

   You should have received a copy of the GNU Lesser General Public License
   along with spice-html5.  If not, see <http://www.gnu.org/licenses/>.
*/

export class SpiceDataView {
  u8: Uint8Array
  buffers: ArrayBuffer[]
  bufferOffsets: number[]
  totalLength: number

  constructor (buffer: ArrayBuffer | ArrayBuffer[], byteOffset?: number, byteLength?: number) {
    if (Array.isArray(buffer)) {
      this.buffers = buffer
      this.bufferOffsets = []
      this.totalLength = 0
      for (const buf of buffer) {
        this.bufferOffsets.push(this.totalLength)
        this.totalLength += buf.byteLength
      }
      if (byteOffset !== undefined) {
        if (byteLength !== undefined) {
          this.u8 = this._createU8Array(byteOffset, byteLength)
        } else {
          this.u8 = this._createU8Array(byteOffset, this.totalLength - byteOffset)
        }
      } else {
        this.u8 = this._createU8Array(0, this.totalLength)
      }
    } else {
      this.buffers = [buffer]
      this.bufferOffsets = [0]
      this.totalLength = buffer.byteLength
      if (byteOffset !== undefined) {
        if (byteLength !== undefined) {
          this.u8 = new Uint8Array(buffer, byteOffset, byteLength)
        } else {
          this.u8 = new Uint8Array(buffer, byteOffset)
        }
      } else {
        this.u8 = new Uint8Array(buffer)
      }
    }
  }

  private _createU8Array (offset: number, length: number): Uint8Array {
    const result = new Uint8Array(length)
    let resultOffset = 0
    let remaining = length
    let currentOffset = offset

    for (let i = 0; i < this.buffers.length && remaining > 0; i++) {
      const bufStart = this.bufferOffsets[i]
      const bufEnd = bufStart + this.buffers[i].byteLength

      if (currentOffset < bufEnd) {
        const startInBuf = Math.max(0, currentOffset - bufStart)
        const endInBuf = Math.min(this.buffers[i].byteLength, startInBuf + remaining)
        const copyLength = endInBuf - startInBuf

        if (copyLength > 0) {
          const src = new Uint8Array(this.buffers[i], startInBuf, copyLength)
          result.set(src, resultOffset)
          resultOffset += copyLength
          remaining -= copyLength
          currentOffset += copyLength
        }
      }
    }

    return result
  }

  private _getByteAt (globalOffset: number): number {
    for (let i = this.buffers.length - 1; i >= 0; i--) {
      if (globalOffset >= this.bufferOffsets[i]) {
        const localOffset = globalOffset - this.bufferOffsets[i]
        if (localOffset < this.buffers[i].byteLength) {
          return new Uint8Array(this.buffers[i])[localOffset]
        }
      }
    }
    return 0
  }

  getUint8 (byteOffset: number, _littleEndian?: boolean): number {
    return this.u8[byteOffset]
  }

  getUint16 (byteOffset: number, littleEndian?: boolean): number {
    let low = 1; let high = 0
    if (littleEndian) {
      low = 0
      high = 1
    }

    return (this.u8[byteOffset + high] << 8) | this.u8[byteOffset + low]
  }

  getUint32 (byteOffset: number, littleEndian?: boolean): number {
    let low = 2; let high = 0
    if (littleEndian) {
      low = 0
      high = 2
    }

    return (this.getUint16(byteOffset + high, littleEndian) << 16) |
                this.getUint16(byteOffset + low, littleEndian)
  }

  getUint64 (byteOffset: number, littleEndian?: boolean): number {
    let low = 4; let high = 0
    if (littleEndian) {
      low = 0
      high = 4
    }

    return (this.getUint32(byteOffset + high, littleEndian) << 32) |
                this.getUint32(byteOffset + low, littleEndian)
  }

  setUint8 (byteOffset: number, b: number, _littleEndian?: boolean): void {
    this.u8[byteOffset] = (b & 0xff)
  }

  setUint16 (byteOffset: number, i: number, littleEndian?: boolean): void {
    let low = 1; let high = 0
    if (littleEndian) {
      low = 0
      high = 1
    }
    this.u8[byteOffset + high] = (i & 0xffff) >> 8
    this.u8[byteOffset + low] = (i & 0x00ff)
  }

  setUint32 (byteOffset: number, w: number, littleEndian?: boolean): void {
    let low = 2; let high = 0
    if (littleEndian) {
      low = 0
      high = 2
    }

    this.setUint16(byteOffset + high, (w & 0xffffffff) >> 16, littleEndian)
    this.setUint16(byteOffset + low, (w & 0x0000ffff), littleEndian)
  }

  setUint64 (byteOffset: number, w: number, littleEndian?: boolean): void {
    let low = 4; let high = 0
    if (littleEndian) {
      low = 0
      high = 4
    }

    this.setUint32(byteOffset + high, (w & 0xffffffffffffffff) >> 32, littleEndian)
    this.setUint32(byteOffset + low, (w & 0x00000000ffffffff), littleEndian)
  }

  sliceData (start: number, end?: number): ArrayBuffer {
    const actualEnd = end !== undefined ? end : this.u8.length
    return this.u8.slice(start, actualEnd).buffer
  }
}
