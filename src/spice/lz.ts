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

import { Constants } from './enums'

/* ----------------------------------------------------------------------------
**  lz.js
**      Functions for handling SPICE_IMAGE_TYPE_LZ_RGB
**  Adapted from lz.c .
**-------------------------------------------------------------------------- */
function lz_rgb32_decompress (in_buf: Uint8Array, at: number, out_buf: Uint8ClampedArray, type: number, default_alpha: boolean): number {
  let encoder = at
  let op = 0
  let ctrl: number
  let i = 0

  for (ctrl = in_buf[encoder++]; (op * 4) < out_buf.length; ctrl = in_buf[encoder++]) {
    let ref = op
    let len = ctrl >> 5
    let ofs = (ctrl & 31) << 8

    if (ctrl >= 32) {
      var code: number
      len--

      if (len == 7 - 1) {
        do {
          code = in_buf[encoder++]
          len += code
        } while (code == 255)
      }
      code = in_buf[encoder++]
      ofs += code

      if (code == 255) {
        if ((ofs - code) == (31 << 8)) {
          ofs = in_buf[encoder++] << 8
          ofs += in_buf[encoder++]
          ofs += 8191
        }
      }
      len += 1
      if (type == Constants.LZ_IMAGE_TYPE_RGBA) {
        len += 2
      }

      ofs += 1

      ref -= ofs
      if (ref == (op - 1)) {
        const b = ref
        for (; len; --len) {
          if (type == Constants.LZ_IMAGE_TYPE_RGBA) {
            out_buf[(op * 4) + 3] = out_buf[(b * 4) + 3]
          } else {
            for (i = 0; i < 4; i++) {
              out_buf[(op * 4) + i] = out_buf[(b * 4) + i]
            }
          }
          op++
        }
      } else {
        for (; len; --len) {
          if (type == Constants.LZ_IMAGE_TYPE_RGBA) {
            out_buf[(op * 4) + 3] = out_buf[(ref * 4) + 3]
          } else {
            for (i = 0; i < 4; i++) {
              out_buf[(op * 4) + i] = out_buf[(ref * 4) + i]
            }
          }
          op++
          ref++
        }
      }
    } else {
      ctrl++

      if (type == Constants.LZ_IMAGE_TYPE_RGBA) {
        out_buf[(op * 4) + 3] = in_buf[encoder++]
      } else {
        out_buf[(op * 4) + 0] = in_buf[encoder + 2]
        out_buf[(op * 4) + 1] = in_buf[encoder + 1]
        out_buf[(op * 4) + 2] = in_buf[encoder + 0]
        if (default_alpha) {
          out_buf[(op * 4) + 3] = 255
        }
        encoder += 3
      }
      op++

      for (--ctrl; ctrl; ctrl--) {
        if (type == Constants.LZ_IMAGE_TYPE_RGBA) {
          out_buf[(op * 4) + 3] = in_buf[encoder++]
        } else {
          out_buf[(op * 4) + 0] = in_buf[encoder + 2]
          out_buf[(op * 4) + 1] = in_buf[encoder + 1]
          out_buf[(op * 4) + 2] = in_buf[encoder + 0]
          if (default_alpha) {
            out_buf[(op * 4) + 3] = 255
          }
          encoder += 3
        }
        op++
      }
    }
  }
  return encoder - 1
}

function flip_image_data (img: ImageData): void {
  const wb = img.width * 4
  const h = img.height
  let temp_h = h
  const buff = new Uint8Array(img.width * img.height * 4)
  while (temp_h--) {
    buff.set(img.data.subarray(temp_h * wb, (temp_h + 1) * wb), (h - temp_h - 1) * wb)
  }
  img.data.set(buff)
}

function lz4_decompress (in_buf: Uint8Array, out_buf: Uint8Array): number {
  let ip = 0
  let op = 0
  const in_len = in_buf.length
  const out_len = out_buf.length

  while (ip < in_len && op < out_len) {
    const token = in_buf[ip++]
    let literal_len = token >> 4
    let match_len = token & 0x0F

    if (literal_len > 0) {
      if (literal_len === 0x0F) {
        var len
        do {
          len = in_buf[ip++]
          literal_len += len
        } while (len === 0xFF && ip < in_len)
      }

      if (op + literal_len > out_len) {
        literal_len = out_len - op
      }
      out_buf.set(in_buf.subarray(ip, ip + literal_len), op)
      ip += literal_len
      op += literal_len

      if (op >= out_len || ip >= in_len) {
        break
      }
    }

    const offset = in_buf[ip] | (in_buf[ip + 1] << 8)
    ip += 2

    if (match_len === 0x0F) {
      var len
      do {
        len = in_buf[ip++]
        match_len += len
      } while (len === 0xFF && ip < in_len)
    }
    match_len += 4

    let ref = op - offset
    if (ref < 0) {
      break
    }

    if (op + match_len > out_len) {
      match_len = out_len - op
    }

    for (let i = 0; i < match_len; i++) {
      out_buf[op++] = out_buf[ref++]
    }
  }

  return op
}

export function convert_spice_lz_to_web (context: CanvasRenderingContext2D, lz_image: any): ImageData | undefined {
  let at: number

  if (lz_image.type >= Constants.LZ_IMAGE_TYPE_LZ4_RGB32 && lz_image.type <= Constants.LZ_IMAGE_TYPE_LZ4_XXXA) {
    const compressed = new Uint8Array(lz_image.data)
    var ret = context.createImageData(lz_image.width, lz_image.height)
    const out_len = lz_image.width * lz_image.height * 4
    const decompressed = new Uint8Array(out_len)

    lz4_decompress(compressed, decompressed)

    if (lz_image.type === Constants.LZ_IMAGE_TYPE_LZ4_RGBA ||
            lz_image.type === Constants.LZ_IMAGE_TYPE_LZ4_XXXA) {
      ret.data.set(decompressed)
    } else {
      for (let i = 0; i < out_len; i += 4) {
        ret.data[i] = decompressed[i + 2]
        ret.data[i + 1] = decompressed[i + 1]
        ret.data[i + 2] = decompressed[i]
        ret.data[i + 3] = 255
      }
    }

    if (!lz_image.top_down) {
      flip_image_data(ret)
    }
    return ret
  }

  if (lz_image.type === Constants.LZ_IMAGE_TYPE_RGB32 || lz_image.type === Constants.LZ_IMAGE_TYPE_RGBA) {
    var u8 = new Uint8Array(lz_image.data)
    var ret = context.createImageData(lz_image.width, lz_image.height)

    at = lz_rgb32_decompress(u8, 0, ret.data, Constants.LZ_IMAGE_TYPE_RGB32, lz_image.type != Constants.LZ_IMAGE_TYPE_RGBA)
    if (!lz_image.top_down) {
      flip_image_data(ret)
    }

    if (lz_image.type == Constants.LZ_IMAGE_TYPE_RGBA) {
      lz_rgb32_decompress(u8, at, ret.data, Constants.LZ_IMAGE_TYPE_RGBA, false)
    }
    return ret
  } else if (lz_image.type === Constants.LZ_IMAGE_TYPE_XXXA) {
    var u8 = new Uint8Array(lz_image.data)
    var ret = context.createImageData(lz_image.width, lz_image.height)
    lz_rgb32_decompress(u8, 0, ret.data, Constants.LZ_IMAGE_TYPE_RGBA, false)
    return ret
  }
  return undefined
}
