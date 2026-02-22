/*
 *    Copyright (C) 2012 by Jeremy P. White <jwhite@codeweavers.com>
 *    Copyright (C) 2012 by Aric Stewart <aric@codeweavers.com>
 *
 *    This file is part of spice-html5.
 *
 *    spice-html5 is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU Lesser General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    (at your option) any later version.
 *
 *    spice-html5 is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Lesser General Public License for more details.
 *
 *    You should have received a copy of the GNU Lesser General Public License
 *    along with spice-html5.  If not, see <http://www.gnu.org/licenses/>.
 */

import { SpiceDataView } from './spicedataview'

let encoder: QuicEncoder | undefined

const Constants = {
  QUIC_IMAGE_TYPE_INVALID: 0,
  QUIC_IMAGE_TYPE_GRAY: 1,
  QUIC_IMAGE_TYPE_RGB16: 2,
  QUIC_IMAGE_TYPE_RGB24: 3,
  QUIC_IMAGE_TYPE_RGB32: 4,
  QUIC_IMAGE_TYPE_RGBA: 5
}

const DEFevol = 3
const DEFwmimax = 6
const DEFwminext = 2048
let need_init = true
const DEFmaxclen = 26
const evol = DEFevol
const wmimax = DEFwmimax
const wminext = DEFwminext

interface QuicFamily {
  nGRcodewords: number[]
  notGRcwlen: number[]
  notGRprefixmask: number[]
  notGRsuffixlen: number[]
  xlatU2L: number[]
  xlatL2U: number[]
}

const family_5bpc: QuicFamily = {
  nGRcodewords: [0, 0, 0, 0, 0, 0, 0, 0],
  notGRcwlen: [0, 0, 0, 0, 0, 0, 0, 0],
  notGRprefixmask: [0, 0, 0, 0, 0, 0, 0, 0],
  notGRsuffixlen: [0, 0, 0, 0, 0, 0, 0, 0],
  xlatU2L: [0, 0, 0, 0, 0, 0, 0, 0],
  xlatL2U: [0, 0, 0, 0, 0, 0, 0, 0]
}

const family_8bpc: QuicFamily = {
  nGRcodewords: [0, 0, 0, 0, 0, 0, 0, 0],
  notGRcwlen: [0, 0, 0, 0, 0, 0, 0, 0],
  notGRprefixmask: [0, 0, 0, 0, 0, 0, 0, 0],
  notGRsuffixlen: [0, 0, 0, 0, 0, 0, 0, 0],
  xlatU2L: [0, 0, 0, 0, 0, 0, 0, 0],
  xlatL2U: [0, 0, 0, 0, 0, 0, 0, 0]
}

const bppmask = [0x00000000,
  0x00000001, 0x00000003, 0x00000007, 0x0000000f,
  0x0000001f, 0x0000003f, 0x0000007f, 0x000000ff,
  0x000001ff, 0x000003ff, 0x000007ff, 0x00000fff,
  0x00001fff, 0x00003fff, 0x00007fff, 0x0000ffff,
  0x0001ffff, 0x0003ffff, 0x0007ffff, 0x000fffff,
  0x001fffff, 0x003fffff, 0x007fffff, 0x00ffffff,
  0x01ffffff, 0x03ffffff, 0x07ffffff, 0x0fffffff,
  0x1fffffff, 0x3fffffff, 0x7fffffff, 0xffffffff]

const zeroLUT: number[] = []

const besttrigtab = [
  [550, 900, 800, 700, 500, 350, 300, 200, 180, 180, 160],
  [110, 550, 900, 800, 550, 400, 350, 250, 140, 160, 140],
  [100, 120, 550, 900, 700, 500, 400, 300, 220, 250, 160]]

const J = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5, 5, 6, 6,
  7, 7, 8, 9, 10, 11, 12, 13, 14, 15]

const lzeroes = [
  8, 7, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3,
  3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0]

const tabrand_chaos = [
  0x02c57542, 0x35427717, 0x2f5a2153, 0x9244f155, 0x7bd26d07, 0x354c6052,
  0x57329b28, 0x2993868e, 0x6cd8808c, 0x147b46e0, 0x99db66af, 0xe32b4cac,
  0x1b671264, 0x9d433486, 0x62a4c192, 0x06089a4b, 0x9e3dce44, 0xdaabee13,
  0x222425ea, 0xa46f331d, 0xcd589250, 0x8bb81d7f, 0xc8b736b9, 0x35948d33,
  0xd7ac7fd0, 0x5fbe2803, 0x2cfbc105, 0x013dbc4e, 0x7a37820f, 0x39f88e9e,
  0xedd58794, 0xc5076689, 0xfcada5a4, 0x64c2f46d, 0xb3ba3243, 0x8974b4f9,
  0x5a05aebd, 0x20afcd00, 0x39e2b008, 0x88a18a45, 0x600bde29, 0xf3971ace,
  0xf37b0a6b, 0x7041495b, 0x70b707ab, 0x06beffbb, 0x4206051f, 0xe13c4ee3,
  0xc1a78327, 0x91aa067c, 0x8295f72a, 0x732917a6, 0x1d871b4d, 0x4048f136,
  0xf1840e7e, 0x6a6048c1, 0x696cb71a, 0x7ff501c3, 0x0fc6310b, 0x57e0f83d,
  0x8cc26e74, 0x11a525a2, 0x946934c7, 0x7cd888f0, 0x8f9d8604, 0x4f86e73b,
  0x04520316, 0xdeeea20c, 0xf1def496, 0x67687288, 0xf540c5b2, 0x22401484,
  0x3478658a, 0xc2385746, 0x01979c2c, 0x5dad73c8, 0x0321f58b, 0xf0fedbee,
  0x92826ddf, 0x284bec73, 0x5b1a1975, 0x03df1e11, 0x20963e01, 0xa17cf12b,
  0x740d776e, 0xa7a6bf3c, 0x01b5cce4, 0x1118aa76, 0xfc6fac0a, 0xce927e9b,
  0x00bf2567, 0x806f216c, 0xbca69056, 0x795bd3e9, 0xc9dc4557, 0x8929b6c2,
  0x789d52ec, 0x3f3fbf40, 0xb9197368, 0xa38c15b5, 0xc3b44fa8, 0xca8333b0,
  0xb7e8d590, 0xbe807feb, 0xbf5f8360, 0xd99e2f5c, 0x372928e1, 0x7c757c4c,
  0x0db5b154, 0xc01ede02, 0x1fc86e78, 0x1f3985be, 0xb4805c77, 0x00c880fa,
  0x974c1b12, 0x35ab0214, 0xb2dc840d, 0x5b00ae37, 0xd313b026, 0xb260969d,
  0x7f4c8879, 0x1734c4d3, 0x49068631, 0xb9f6a021, 0x6b863e6f, 0xcee5debf,
  0x29f8c9fb, 0x53dd6880, 0x72b61223, 0x1f67a9fd, 0x0a0f6993, 0x13e59119,
  0x11cca12e, 0xfe6b6766, 0x16b6effc, 0x97918fc4, 0xc2b8a563, 0x94f2f741,
  0x0bfa8c9a, 0xd1537ae8, 0xc1da349c, 0x873c60ca, 0x95005b85, 0x9b5c080e,
  0xbc8abbd9, 0xe1eab1d2, 0x6dac9070, 0x4ea9ebf1, 0xe0cf30d4, 0x1ef5bd7b,
  0xd161043e, 0x5d2fa2e2, 0xff5d3cae, 0x86ed9f87, 0x2aa1daa1, 0xbd731a34,
  0x9e8f4b22, 0xb1c2c67a, 0xc21758c9, 0xa182215d, 0xccb01948, 0x8d168df7,
  0x04238cfe, 0x368c3dbc, 0x0aeadca5, 0xbad21c24, 0x0a71fee5, 0x9fc5d872,
  0x54c152c6, 0xfc329483, 0x6783384a, 0xeddb3e1c, 0x65f90e30, 0x884ad098,
  0xce81675a, 0x4b372f7d, 0x68bf9a39, 0x43445f1e, 0x40f8d8cb, 0x90d5acb6,
  0x4cd07282, 0x349eeb06, 0x0c9d5332, 0x520b24ef, 0x80020447, 0x67976491,
  0x2f931ca3, 0xfe9b0535, 0xfcd30220, 0x61a9e6cc, 0xa487d8d7, 0x3f7c5dd1,
  0x7d0127c5, 0x48f51d15, 0x60dea871, 0xc9a91cb7, 0x58b53bb3, 0x9d5e0b2d,
  0x624a78b4, 0x30dbee1b, 0x9bdf22e7, 0x1df5c299, 0x2d5643a7, 0xf4dd35ff,
  0x03ca8fd6, 0x53b47ed8, 0x6f2c19aa, 0xfeb0c1f4, 0x49e54438, 0x2f2577e6,
  0xbf876969, 0x72440ea9, 0xfa0bafb8, 0x74f5b3a0, 0x7dd357cd, 0x89ce1358,
  0x6ef2cdda, 0x1e7767f3, 0xa6be9fdb, 0x4f5f88f8, 0xba994a3a, 0x08ca6b65,
  0xe0893818, 0x9e00a16a, 0xf42bfc8f, 0x9972eedc, 0x749c8b51, 0x32c05f5e,
  0xd706805f, 0x6bfbb7cf, 0xd9210a10, 0x31a1db97, 0x923a9559, 0x37a7a1f6,
  0x059f8861, 0xca493e62, 0x65157e81, 0x8f6467dd, 0xab85ff9f, 0x9331aff2,
  0x8616b9f5, 0xedbd5695, 0xee7e29b1, 0x313ac44f, 0xb903112f, 0x432ef649,
  0xdc0a36c0, 0x61cf2bba, 0x81474925, 0xa8b6c7ad, 0xee5931de, 0xb2f8158d,
  0x59fb7409, 0x2e3dfaed, 0x9af25a3f, 0xe1fed4d5]

const rgb32_pixel_pad = 3
const rgb32_pixel_r = 2
const rgb32_pixel_g = 1
const rgb32_pixel_b = 0
const rgb32_pixel_size = 4

/* Helper Functions */

function ceil_log_2 (val: number): number {
  if (val === 1) { return 0 }

  let result = 1
  val -= 1
  while (val = val >>> 1) { result++ }

  return result
}

function family_init (family: QuicFamily, bpc: number, limit: number): void {
  let l: number
  for (l = 0; l < bpc; l++) {
    let altprefixlen, altcodewords
    altprefixlen = limit - bpc
    if (altprefixlen > bppmask[bpc - l]) { altprefixlen = bppmask[bpc - l] }

    altcodewords = bppmask[bpc] + 1 - (altprefixlen << l)
    family.nGRcodewords[l] = (altprefixlen << l)
    family.notGRcwlen[l] = altprefixlen + ceil_log_2(altcodewords)
    family.notGRprefixmask[l] = bppmask[32 - altprefixlen] >>> 0
    family.notGRsuffixlen[l] = ceil_log_2(altcodewords)
  }

  /* decorelate_init */
  const pixelbitmask = bppmask[bpc]
  const pixelbitmaskshr = pixelbitmask >>> 1
  let s: number
  for (s = 0; s <= pixelbitmask; s++) {
    if (s <= pixelbitmaskshr) {
      family.xlatU2L[s] = s << 1
    } else {
      family.xlatU2L[s] = ((pixelbitmask - s) << 1) + 1
    }
  }

  /* corelate_init */
  for (s = 0; s <= pixelbitmask; s++) {
    if (s & 0x01) {
      family.xlatL2U[s] = pixelbitmask - (s >>> 1)
    } else {
      family.xlatL2U[s] = (s >>> 1)
    }
  }
}

function quic_image_bpc (type: number): number {
  switch (type) {
    case Constants.QUIC_IMAGE_TYPE_GRAY:
      return 8
    case Constants.QUIC_IMAGE_TYPE_RGB16:
      return 5
    case Constants.QUIC_IMAGE_TYPE_RGB24:
      return 8
    case Constants.QUIC_IMAGE_TYPE_RGB32:
      return 8
    case Constants.QUIC_IMAGE_TYPE_RGBA:
      return 8
    case Constants.QUIC_IMAGE_TYPE_INVALID:
    default:
      console.log('quic: bad image type\n')
      return 0
  }
}

function cnt_l_zeroes (bits: number): number {
  if (bits & 0xff800000) {
    return lzeroes[bits >>> 24]
  } else if (bits & 0xffff8000) {
    return 8 + lzeroes[(bits >>> 16) & 0x000000ff]
  } else if (bits & 0xffffff80) {
    return 16 + lzeroes[(bits >>> 8) & 0x000000ff]
  } else {
    return 24 + lzeroes[bits & 0x000000ff]
  }
}

function golomb_decoding_8bpc (l: number, bits: number): { codewordlen: number, rc: number } {
  let rc: number
  let cwlen: number

  if (bits < 0 || bits > family_8bpc.notGRprefixmask[l]) {
    const zeroprefix = cnt_l_zeroes(bits)
    cwlen = zeroprefix + 1 + l
    rc = (zeroprefix << l) | (bits >> (32 - cwlen)) & bppmask[l]
  } else {
    cwlen = family_8bpc.notGRcwlen[l]
    rc = family_8bpc.nGRcodewords[l] + ((bits >> (32 - cwlen)) & bppmask[family_8bpc.notGRsuffixlen[l]])
  }
  return { codewordlen: cwlen, rc }
}

function golomb_code_len_8bpc (n: number, l: number): number {
  if (n < family_8bpc.nGRcodewords[l]) {
    return (n >>> l) + 1 + l
  } else {
    return family_8bpc.notGRcwlen[l]
  }
}

class QuicModel {
  levels: number
  n_buckets_ptrs: number
  repfirst: number
  firstsize: number
  repnext: number
  mulsize: number
  n_buckets: number

  constructor (bpc: number) {
    let bstart: number
    let bend = 0

    this.levels = 0x1 << bpc
    this.n_buckets_ptrs = 0

    switch (evol as number) {
      case 1:
        this.repfirst = 3
        this.firstsize = 1
        this.repnext = 2
        this.mulsize = 2
        break
      case 3:
        this.repfirst = 1
        this.firstsize = 1
        this.repnext = 1
        this.mulsize = 2
        break
      case 5:
        this.repfirst = 1
        this.firstsize = 1
        this.repnext = 1
        this.mulsize = 4
        break
      case 0:
      case 2:
      case 4:
        console.log('quic: findmodelparams(): evol value obsolete!!!\n')
        break
      default:
        console.log('quic: findmodelparams(): evol out of range!!!\n')
    }

    this.n_buckets = 0
    let repcntr = this.repfirst + 1
    let bsize = this.firstsize

    do {
      if (this.n_buckets) {
        bstart = bend + 1
      } else {
        bstart = 0
      }

      if (!--repcntr) {
        repcntr = this.repnext
        bsize *= this.mulsize
      }

      bend = bstart + bsize - 1
      if (bend + bsize >= this.levels) {
        bend = this.levels - 1
      }

      if (!this.n_buckets_ptrs) {
        this.n_buckets_ptrs = this.levels
      }

      this.n_buckets++
    } while (bend < this.levels - 1)
  }
}

class QuicBucket {
  counters: number[]
  bestcode: number

  constructor () {
    this.counters = [0, 0, 0, 0, 0, 0, 0, 0]
    this.bestcode = 0
  }

  reste (bpp: number): void {
    this.bestcode = bpp
    this.counters = [0, 0, 0, 0, 0, 0, 0, 0]
  }

  update_model_8bpc (state: CommonState, curval: number, bpp: number): void {
    let i: number

    let bestcode = bpp - 1
    let bestcodelen = (this.counters[bestcode] += golomb_code_len_8bpc(curval, bestcode))

    for (i = bpp - 2; i >= 0; i--) {
      const ithcodelen = (this.counters[i] += golomb_code_len_8bpc(curval, i))

      if (ithcodelen < bestcodelen) {
        bestcode = i
        bestcodelen = ithcodelen
      }
    }

    this.bestcode = bestcode

    if (bestcodelen > state.wm_trigger) {
      for (i = 0; i < bpp; i++) {
        this.counters[i] = this.counters[i] >>> 1
      }
    }
  }
}

class QuicFamilyStat {
  buckets_ptrs: QuicBucket[]
  buckets_buf: QuicBucket[]

  constructor () {
    this.buckets_ptrs = []
    this.buckets_buf = []
  }

  fill_model_structures (model: QuicModel): boolean {
    let bstart: number
    let bend = 0
    let bnumber = 0

    let repcntr = model.repfirst + 1
    let bsize = model.firstsize

    do {
      if (bnumber) {
        bstart = bend + 1
      } else {
        bstart = 0
      }

      if (!--repcntr) {
        repcntr = model.repnext
        bsize *= model.mulsize
      }

      bend = bstart + bsize - 1
      if (bend + bsize >= model.levels) {
        bend = model.levels - 1
      }

      this.buckets_buf[bnumber] = new QuicBucket()

      let i: number
      for (i = bstart; i <= bend; i++) {
        this.buckets_ptrs[i] = this.buckets_buf[bnumber]
      }

      bnumber++
    } while (bend < model.levels - 1)
    return true
  }
}

class CommonState {
  waitcnt: number
  tabrand_seed: number
  wm_trigger: number
  wmidx: number
  wmileft: number
  melcstate: number
  melclen: number
  melcorder: number

  constructor () {
    this.waitcnt = 0
    this.tabrand_seed = 0xff
    this.wm_trigger = 0
    this.wmidx = 0
    this.wmileft = wminext
    this.melcstate = 0
    this.melclen = J[0]
    this.melcorder = 1 << this.melclen
  }

  set_wm_trigger (): void {
    let wm = this.wmidx
    if (wm > 10) {
      wm = 10
    }

    this.wm_trigger = besttrigtab[Math.floor(evol / 2)][wm]
  }

  reste (): void {
    this.waitcnt = 0
    this.tabrand_seed = 0x0ff
    this.wmidx = 0
    this.wmileft = wminext

    this.set_wm_trigger()

    this.melcstate = 0
    this.melclen = J[0]
    this.melcorder = 1 << this.melclen
  }

  tabrand (): number {
    this.tabrand_seed++
    return tabrand_chaos[this.tabrand_seed & 0x0ff]
  }
}

class QuicChannel {
  state: CommonState
  family_stat_8bpc: QuicFamilyStat
  family_stat_5bpc: QuicFamilyStat
  correlate_row: { zero: number, row: number[] }
  model_8bpc: QuicModel
  model_5bpc: QuicModel
  buckets_ptrs: QuicBucket[]

  constructor (model_8bpc: QuicModel, model_5bpc: QuicModel) {
    this.state = new CommonState()
    this.family_stat_8bpc = new QuicFamilyStat()
    this.family_stat_5bpc = new QuicFamilyStat()
    this.correlate_row = { zero: 0, row: [] }
    this.model_8bpc = model_8bpc
    this.model_5bpc = model_5bpc
    this.buckets_ptrs = []

    if (!this.family_stat_8bpc.fill_model_structures(this.model_8bpc)) {
      throw new Error('Failed to create 8bpc model structures')
    }

    if (!this.family_stat_5bpc.fill_model_structures(this.model_5bpc)) {
      throw new Error('Failed to create 5bpc model structures')
    }
  }

  reste (bpc: number): boolean {
    let j: number
    this.correlate_row = { zero: 0, row: [] }

    if (bpc == 8) {
      for (j = 0; j < this.model_8bpc.n_buckets; j++) { this.family_stat_8bpc.buckets_buf[j].reste(7) }
      this.buckets_ptrs = this.family_stat_8bpc.buckets_ptrs
    } else if (bpc == 5) {
      for (j = 0; j < this.model_5bpc.n_buckets; j++) { this.family_stat_8bpc.buckets_buf[j].reste(4) }
      this.buckets_ptrs = this.family_stat_5bpc.buckets_ptrs
    } else {
      console.log('quic: bad bpc %d\n', bpc)
      return false
    }

    this.state.reste()
    return true
  }
}

class QuicEncoder {
  type: number
  width: number
  height: number
  io_idx: number
  io_available_bits: number
  io_word: number
  io_next_word: number
  io_now: Uint8Array
  io_end: number
  rows_completed: number
  rgb_state: CommonState
  model_8bpc: QuicModel
  model_5bpc: QuicModel
  channels: QuicChannel[]

  constructor () {
    this.type = 0
    this.width = 0
    this.height = 0
    this.io_idx = 0
    this.io_available_bits = 0
    this.io_word = 0
    this.io_next_word = 0
    this.io_now = new Uint8Array(0)
    this.io_end = 0
    this.rows_completed = 0
    this.rgb_state = new CommonState()
    this.model_8bpc = new QuicModel(8)
    this.model_5bpc = new QuicModel(5)
    this.channels = []

    for (let i = 0; i < 4; i++) {
      this.channels[i] = new QuicChannel(this.model_8bpc, this.model_5bpc)
    }
  }

  reste (io_ptr: Uint8Array): boolean {
    this.rgb_state.reste()

    this.io_now = io_ptr
    this.io_end = this.io_now.length
    this.io_idx = 0
    this.rows_completed = 0
    return true
  }

  read_io_word (): void {
    if (this.io_idx >= this.io_end) {
      throw new Error('quic: out of data')
    }
    this.io_next_word = this.io_now[this.io_idx++] | this.io_now[this.io_idx++] << 8 | this.io_now[this.io_idx++] << 16 | this.io_now[this.io_idx++] << 24
  }

  decode_eatbits (len: number): void {
    this.io_word = this.io_word << len

    const delta = (this.io_available_bits - len)
    if (delta >= 0) {
      this.io_available_bits = delta
      this.io_word |= this.io_next_word >>> this.io_available_bits
    } else {
      const positiveDelta = -1 * delta
      this.io_word |= this.io_next_word << positiveDelta
      this.read_io_word()
      this.io_available_bits = 32 - positiveDelta
      this.io_word |= this.io_next_word >>> this.io_available_bits
    }
  }

  decode_eat32bits (): void {
    this.decode_eatbits(16)
    this.decode_eatbits(16)
  }

  reste_channels (bpc: number): boolean {
    for (let i = 0; i < 4; i++) {
      if (!this.channels[i].reste(bpc)) { return false }
    }
    return true
  }

  quic_decode_begin (io_ptr: Uint8Array): boolean {
    if (!this.reste(io_ptr)) {
      return false
    }

    this.io_idx = 0
    this.io_next_word = this.io_now[this.io_idx++] | this.io_now[this.io_idx++] << 8 | this.io_now[this.io_idx++] << 16 | this.io_now[this.io_idx++] << 24
    this.io_word = this.io_next_word
    this.io_available_bits = 0

    const magic = this.io_word
    this.decode_eat32bits()
    if (magic != 0x43495551) { /* QUIC */
      console.log('quic: bad magic ' + magic.toString(16))
      return false
    }

    const version = this.io_word
    this.decode_eat32bits()
    if (version != ((0 << 16) | (0 & 0xffff))) {
      console.log('quic: bad version ' + version.toString(16))
      return false
    }

    this.type = this.io_word
    this.decode_eat32bits()

    this.width = this.io_word
    this.decode_eat32bits()

    this.height = this.io_word
    this.decode_eat32bits()

    const bpc = quic_image_bpc(this.type)

    if (!this.reste_channels(bpc)) { return false }

    return true
  }

  quic_rgb32_uncompress_row0_seg (i: number, cur_row: Uint8Array, end: number, waitmask: number, bpc: number, bpc_mask: number): void {
    let stopidx: number
    const n_channels = 3
    let c: number
    let a: { codewordlen: number, rc: number }

    if (!i) {
      cur_row[rgb32_pixel_pad] = 0
      c = 0
      do {
        a = golomb_decoding_8bpc(this.channels[c].buckets_ptrs[this.channels[c].correlate_row.zero].bestcode, this.io_word)
        this.channels[c].correlate_row.row[0] = a.rc
        cur_row[2 - c] = (family_8bpc.xlatL2U[a.rc] & 0xFF)
        this.decode_eatbits(a.codewordlen)
      } while (++c < n_channels)

      if (this.rgb_state.waitcnt) {
        --this.rgb_state.waitcnt
      } else {
        this.rgb_state.waitcnt = (this.rgb_state.tabrand() & waitmask)
        c = 0
        do {
          this.channels[c].buckets_ptrs[this.channels[c].correlate_row.zero].update_model_8bpc(this.rgb_state, this.channels[c].correlate_row.row[0], bpc)
        } while (++c < n_channels)
      }
      stopidx = ++i + this.rgb_state.waitcnt
    } else {
      stopidx = i + this.rgb_state.waitcnt
    }

    while (stopidx < end) {
      for (; i <= stopidx; i++) {
        cur_row[(i * rgb32_pixel_size) + rgb32_pixel_pad] = 0
        c = 0
        do {
          a = golomb_decoding_8bpc(this.channels[c].buckets_ptrs[this.channels[c].correlate_row.row[i - 1]].bestcode, this.io_word)
          this.channels[c].correlate_row.row[i] = a.rc
          cur_row[(i * rgb32_pixel_size) + (2 - c)] = (family_8bpc.xlatL2U[a.rc] + cur_row[((i - 1) * rgb32_pixel_size) + (2 - c)]) & bpc_mask
          this.decode_eatbits(a.codewordlen)
        } while (++c < n_channels)
      }
      c = 0
      do {
        this.channels[c].buckets_ptrs[this.channels[c].correlate_row.row[stopidx - 1]].update_model_8bpc(this.rgb_state, this.channels[c].correlate_row.row[stopidx], bpc)
      } while (++c < n_channels)
      stopidx = i + (this.rgb_state.tabrand() & waitmask)
    }

    for (; i < end; i++) {
      cur_row[(i * rgb32_pixel_size) + rgb32_pixel_pad] = 0
      c = 0
      do {
        a = golomb_decoding_8bpc(this.channels[c].buckets_ptrs[this.channels[c].correlate_row.row[i - 1]].bestcode, this.io_word)
        this.channels[c].correlate_row.row[i] = a.rc
        cur_row[(i * rgb32_pixel_size) + (2 - c)] = (family_8bpc.xlatL2U[a.rc] + cur_row[((i - 1) * rgb32_pixel_size) + (2 - c)]) & bpc_mask
        this.decode_eatbits(a.codewordlen)
      } while (++c < n_channels)
    }
    this.rgb_state.waitcnt = stopidx - end
  }

  quic_rgb32_uncompress_row0 (cur_row: Uint8Array): void {
    const bpc = 8
    const bpc_mask = 0xff
    let pos = 0
    let width = this.width

    while ((wmimax > this.rgb_state.wmidx) && (this.rgb_state.wmileft <= width)) {
      if (this.rgb_state.wmileft) {
        this.quic_rgb32_uncompress_row0_seg(pos, cur_row,
          pos + this.rgb_state.wmileft,
          bppmask[this.rgb_state.wmidx],
          bpc, bpc_mask)
        pos += this.rgb_state.wmileft
        width -= this.rgb_state.wmileft
      }

      this.rgb_state.wmidx++
      this.rgb_state.set_wm_trigger()
      this.rgb_state.wmileft = wminext
    }

    if (width) {
      this.quic_rgb32_uncompress_row0_seg(pos, cur_row, pos + width,
        bppmask[this.rgb_state.wmidx], bpc, bpc_mask)
      if (wmimax > this.rgb_state.wmidx) {
        this.rgb_state.wmileft -= width
      }
    }
  }

  quic_rgb32_uncompress_row_seg (prev_row: Uint8Array, cur_row: Uint8Array, i: number, end: number, bpc: number, bpc_mask: number): void {
    const n_channels = 3
    const waitmask = bppmask[this.rgb_state.wmidx]

    let a: { codewordlen: number, rc: number }
    let run_index = 0
    let stopidx = 0
    let run_end = 0
    let c: number

    if (!i) {
      cur_row[rgb32_pixel_pad] = 0

      c = 0
      do {
        a = golomb_decoding_8bpc(this.channels[c].buckets_ptrs[this.channels[c].correlate_row.zero].bestcode, this.io_word)
        this.channels[c].correlate_row.row[0] = a.rc
        cur_row[2 - c] = (family_8bpc.xlatL2U[this.channels[c].correlate_row.row[0]] + prev_row[2 - c]) & bpc_mask
        this.decode_eatbits(a.codewordlen)
      } while (++c < n_channels)

      if (this.rgb_state.waitcnt) {
        --this.rgb_state.waitcnt
      } else {
        this.rgb_state.waitcnt = (this.rgb_state.tabrand() & waitmask)
        c = 0
        do {
          this.channels[c].buckets_ptrs[this.channels[c].correlate_row.zero].update_model_8bpc(this.rgb_state, this.channels[c].correlate_row.row[0], bpc)
        } while (++c < n_channels)
      }
      stopidx = ++i + this.rgb_state.waitcnt
    } else {
      stopidx = i + this.rgb_state.waitcnt
    }
    for (;;) {
      let rc = 0
      while (stopidx < end && !rc) {
        for (; i <= stopidx && !rc; i++) {
          const pixel = i * rgb32_pixel_size
          const pixelm1 = (i - 1) * rgb32_pixel_size
          const pixelm2 = (i - 2) * rgb32_pixel_size

          if (prev_row[pixelm1 + rgb32_pixel_r] == prev_row[pixel + rgb32_pixel_r] && prev_row[pixelm1 + rgb32_pixel_g] == prev_row[pixel + rgb32_pixel_g] && prev_row[pixelm1 + rgb32_pixel_b] == prev_row[pixel + rgb32_pixel_b]) {
            if (run_index != i && i > 2 && (cur_row[pixelm1 + rgb32_pixel_r] == cur_row[pixelm2 + rgb32_pixel_r] && cur_row[pixelm1 + rgb32_pixel_g] == cur_row[pixelm2 + rgb32_pixel_g] && cur_row[pixelm1 + rgb32_pixel_b] == cur_row[pixelm2 + rgb32_pixel_b])) {
              /* do run */
              this.rgb_state.waitcnt = stopidx - i
              run_index = i
              run_end = i + this.decode_run(this.rgb_state)

              for (; i < run_end; i++) {
                const pixel = i * rgb32_pixel_size
                const pixelm1 = (i - 1) * rgb32_pixel_size
                cur_row[pixel + rgb32_pixel_pad] = 0
                cur_row[pixel + rgb32_pixel_r] = cur_row[pixelm1 + rgb32_pixel_r]
                cur_row[pixel + rgb32_pixel_g] = cur_row[pixelm1 + rgb32_pixel_g]
                cur_row[pixel + rgb32_pixel_b] = cur_row[pixelm1 + rgb32_pixel_b]
              }

              if (i == end) {
                return
              } else {
                stopidx = i + this.rgb_state.waitcnt
                rc = 1
                break
              }
            }
          }

          c = 0
          cur_row[pixel + rgb32_pixel_pad] = 0
          do {
            const cc = this.channels[c]
            const cr = cc.correlate_row

            a = golomb_decoding_8bpc(cc.buckets_ptrs[cr.row[i - 1]].bestcode, this.io_word)
            cr.row[i] = a.rc
            cur_row[pixel + (2 - c)] = (family_8bpc.xlatL2U[a.rc] + ((cur_row[pixelm1 + (2 - c)] + prev_row[pixel + (2 - c)]) >> 1)) & bpc_mask
            this.decode_eatbits(a.codewordlen)
          } while (++c < n_channels)
        }
        if (rc) { break }

        c = 0
        do {
          this.channels[c].buckets_ptrs[this.channels[c].correlate_row.row[stopidx - 1]].update_model_8bpc(this.rgb_state, this.channels[c].correlate_row.row[stopidx], bpc)
        } while (++c < n_channels)

        stopidx = i + (this.rgb_state.tabrand() & waitmask)
      }

      for (; i < end && !rc; i++) {
        const pixel = i * rgb32_pixel_size
        const pixelm1 = (i - 1) * rgb32_pixel_size
        const pixelm2 = (i - 2) * rgb32_pixel_size

        if (prev_row[pixelm1 + rgb32_pixel_r] == prev_row[pixel + rgb32_pixel_r] && prev_row[pixelm1 + rgb32_pixel_g] == prev_row[pixel + rgb32_pixel_g] && prev_row[pixelm1 + rgb32_pixel_b] == prev_row[pixel + rgb32_pixel_b]) {
          if (run_index != i && i > 2 && (cur_row[pixelm1 + rgb32_pixel_r] == cur_row[pixelm2 + rgb32_pixel_r] && cur_row[pixelm1 + rgb32_pixel_g] == cur_row[pixelm2 + rgb32_pixel_g] && cur_row[pixelm1 + rgb32_pixel_b] == cur_row[pixelm2 + rgb32_pixel_b])) {
            /* do run */
            this.rgb_state.waitcnt = stopidx - i
            run_index = i
            run_end = i + this.decode_run(this.rgb_state)

            for (; i < run_end; i++) {
              const pixel = i * rgb32_pixel_size
              const pixelm1 = (i - 1) * rgb32_pixel_size
              cur_row[pixel + rgb32_pixel_pad] = 0
              cur_row[pixel + rgb32_pixel_r] = cur_row[pixelm1 + rgb32_pixel_r]
              cur_row[pixel + rgb32_pixel_g] = cur_row[pixelm1 + rgb32_pixel_g]
              cur_row[pixel + rgb32_pixel_b] = cur_row[pixelm1 + rgb32_pixel_b]
            }

            if (i == end) {
              return
            } else {
              stopidx = i + this.rgb_state.waitcnt
              rc = 1
              break
            }
          }
        }

        cur_row[pixel + rgb32_pixel_pad] = 0
        c = 0
        do {
          a = golomb_decoding_8bpc(this.channels[c].buckets_ptrs[this.channels[c].correlate_row.row[i - 1]].bestcode, this.io_word)
          this.channels[c].correlate_row.row[i] = a.rc
          cur_row[pixel + (2 - c)] = (family_8bpc.xlatL2U[a.rc] + ((cur_row[pixelm1 + (2 - c)] + prev_row[pixel + (2 - c)]) >> 1)) & bpc_mask
          this.decode_eatbits(a.codewordlen)
        } while (++c < n_channels)
      }

      if (!rc) {
        this.rgb_state.waitcnt = stopidx - end
        return
      }
    }
  }

  decode_run (state: CommonState): number {
    let runlen = 0

    do {
      let hits: number
      const x = (~(this.io_word >>> 24) >>> 0) & 0xff
      const temp = zeroLUT[x]

      for (hits = 1; hits <= temp; hits++) {
        runlen += state.melcorder

        if (state.melcstate < 32) {
          state.melclen = J[++state.melcstate]
          state.melcorder = (1 << state.melclen)
        }
      }
      if (temp != 8) {
        this.decode_eatbits(temp + 1)
        break
      }
      this.decode_eatbits(8)
    } while (true)

    if (state.melclen) {
      runlen += this.io_word >>> (32 - state.melclen)
      this.decode_eatbits(state.melclen)
    }

    if (state.melcstate) {
      state.melclen = J[--state.melcstate]
      state.melcorder = (1 << state.melclen)
    }

    return runlen
  }

  quic_rgb32_uncompress_row (prev_row: Uint8Array, cur_row: Uint8Array): void {
    const bpc = 8
    const bpc_mask = 0xff
    let pos = 0
    let width = this.width

    while ((wmimax > this.rgb_state.wmidx) && (this.rgb_state.wmileft <= width)) {
      if (this.rgb_state.wmileft) {
        this.quic_rgb32_uncompress_row_seg(prev_row, cur_row, pos,
          pos + this.rgb_state.wmileft, bpc, bpc_mask)
        pos += this.rgb_state.wmileft
        width -= this.rgb_state.wmileft
      }

      this.rgb_state.wmidx++
      this.rgb_state.set_wm_trigger()
      this.rgb_state.wmileft = wminext
    }

    if (width) {
      this.quic_rgb32_uncompress_row_seg(prev_row, cur_row, pos,
        pos + width, bpc, bpc_mask)
      if (wmimax > this.rgb_state.wmidx) {
        this.rgb_state.wmileft -= width
      }
    }
  }

  quic_four_uncompress_row0_seg (channel: QuicChannel, i: number, correlate_row: { zero: number, row: number[] }, cur_row: Uint8Array, end: number, waitmask: number, bpc: number, bpc_mask: number): void {
    let stopidx: number
    let a: { codewordlen: number, rc: number }

    if (i == 0) {
      a = golomb_decoding_8bpc(channel.buckets_ptrs[correlate_row.zero].bestcode, this.io_word)
      correlate_row.row[0] = a.rc
      cur_row[rgb32_pixel_pad] = family_8bpc.xlatL2U[a.rc]
      this.decode_eatbits(a.codewordlen)

      if (channel.state.waitcnt) {
        --channel.state.waitcnt
      } else {
        channel.state.waitcnt = (channel.state.tabrand() & waitmask)
        channel.buckets_ptrs[correlate_row.zero].update_model_8bpc(channel.state, correlate_row.row[0], bpc)
      }
      stopidx = ++i + channel.state.waitcnt
    } else {
      stopidx = i + channel.state.waitcnt
    }

    while (stopidx < end) {
      let pbucket: QuicBucket

      for (; i <= stopidx; i++) {
        pbucket = channel.buckets_ptrs[correlate_row.row[i - 1]]

        a = golomb_decoding_8bpc(pbucket.bestcode, this.io_word)
        correlate_row.row[i] = a.rc
        cur_row[(i * rgb32_pixel_size) + rgb32_pixel_pad] = (family_8bpc.xlatL2U[a.rc] + cur_row[((i - 1) * rgb32_pixel_size) + rgb32_pixel_pad]) & bpc_mask
        this.decode_eatbits(a.codewordlen)
      }

      pbucket.update_model_8bpc(channel.state, correlate_row.row[stopidx], bpc)

      stopidx = i + (channel.state.tabrand() & waitmask)
    }

    for (; i < end; i++) {
      a = golomb_decoding_8bpc(channel.buckets_ptrs[correlate_row.row[i - 1]].bestcode, this.io_word)

      correlate_row.row[i] = a.rc
      cur_row[(i * rgb32_pixel_size) + rgb32_pixel_pad] = (family_8bpc.xlatL2U[a.rc] + cur_row[((i - 1) * rgb32_pixel_size) + rgb32_pixel_pad]) & bpc_mask
      this.decode_eatbits(a.codewordlen)
    }
    channel.state.waitcnt = stopidx - end
  }

  quic_four_uncompress_row0 (channel: QuicChannel, cur_row: Uint8Array): void {
    const bpc = 8
    const bpc_mask = 0xff
    const correlate_row = channel.correlate_row
    let pos = 0
    let width = this.width

    while ((wmimax > channel.state.wmidx) && (channel.state.wmileft <= width)) {
      if (channel.state.wmileft) {
        this.quic_four_uncompress_row0_seg(channel, pos, correlate_row, cur_row,
          pos + channel.state.wmileft, bppmask[channel.state.wmidx],
          bpc, bpc_mask)
        pos += channel.state.wmileft
        width -= channel.state.wmileft
      }

      channel.state.wmidx++
      channel.state.set_wm_trigger()
      channel.state.wmileft = wminext
    }

    if (width) {
      this.quic_four_uncompress_row0_seg(channel, pos, correlate_row, cur_row, pos + width,
        bppmask[channel.state.wmidx], bpc, bpc_mask)
      if (wmimax > channel.state.wmidx) {
        channel.state.wmileft -= width
      }
    }
  }

  quic_four_uncompress_row_seg (channel: QuicChannel, correlate_row: { zero: number, row: number[] }, prev_row: Uint8Array, cur_row: Uint8Array, i: number, end: number, bpc: number, bpc_mask: number): void {
    const waitmask = bppmask[channel.state.wmidx]
    let stopidx: number

    let run_index = 0
    let run_end: number

    let a: { codewordlen: number, rc: number }

    if (i == 0) {
      a = golomb_decoding_8bpc(channel.buckets_ptrs[correlate_row.zero].bestcode, this.io_word)

      correlate_row.row[0] = a.rc
      cur_row[rgb32_pixel_pad] = (family_8bpc.xlatL2U[a.rc] + prev_row[rgb32_pixel_pad]) & bpc_mask
      this.decode_eatbits(a.codewordlen)

      if (channel.state.waitcnt) {
        --channel.state.waitcnt
      } else {
        channel.state.waitcnt = (channel.state.tabrand() & waitmask)
        channel.buckets_ptrs[correlate_row.zero].update_model_8bpc(channel.state, correlate_row.row[0], bpc)
      }
      stopidx = ++i + channel.state.waitcnt
    } else {
      stopidx = i + channel.state.waitcnt
    }
    for (;;) {
      let rc = 0
      while (stopidx < end && !rc) {
        let pbucket: QuicBucket
        for (; i <= stopidx && !rc; i++) {
          const pixel = i * rgb32_pixel_size
          const pixelm1 = (i - 1) * rgb32_pixel_size
          const pixelm2 = (i - 2) * rgb32_pixel_size

          if (prev_row[pixelm1 + rgb32_pixel_pad] == prev_row[pixel + rgb32_pixel_pad]) {
            if (run_index != i && i > 2 && cur_row[pixelm1 + rgb32_pixel_pad] == cur_row[pixelm2 + rgb32_pixel_pad]) {
              /* do run */
              channel.state.waitcnt = stopidx - i
              run_index = i

              run_end = i + this.decode_run(channel.state)

              for (; i < run_end; i++) {
                const pixel = i * rgb32_pixel_size
                const pixelm1 = (i - 1) * rgb32_pixel_size
                cur_row[pixel + rgb32_pixel_pad] = cur_row[pixelm1 + rgb32_pixel_pad]
              }

              if (i == end) {
                return
              } else {
                stopidx = i + channel.state.waitcnt
                rc = 1
                break
              }
            }
          }

          pbucket = channel.buckets_ptrs[correlate_row.row[i - 1]]
          a = golomb_decoding_8bpc(pbucket.bestcode, this.io_word)
          correlate_row.row[i] = a.rc
          cur_row[pixel + rgb32_pixel_pad] = (family_8bpc.xlatL2U[a.rc] + ((cur_row[pixelm1 + rgb32_pixel_pad] + prev_row[pixel + rgb32_pixel_pad]) >> 1)) & bpc_mask
          this.decode_eatbits(a.codewordlen)
        }
        if (rc) { break }

        pbucket.update_model_8bpc(channel.state, correlate_row.row[stopidx], bpc)

        stopidx = i + (channel.state.tabrand() & waitmask)
      }

      for (; i < end && !rc; i++) {
        const pixel = i * rgb32_pixel_size
        const pixelm1 = (i - 1) * rgb32_pixel_size
        const pixelm2 = (i - 2) * rgb32_pixel_size
        if (prev_row[pixelm1 + rgb32_pixel_pad] == prev_row[pixel + rgb32_pixel_pad]) {
          if (run_index != i && i > 2 && cur_row[pixelm1 + rgb32_pixel_pad] == cur_row[pixelm2 + rgb32_pixel_pad]) {
            /* do run */
            channel.state.waitcnt = stopidx - i
            run_index = i

            run_end = i + this.decode_run(channel.state)

            for (; i < run_end; i++) {
              const pixel = i * rgb32_pixel_size
              const pixelm1 = (i - 1) * rgb32_pixel_size
              cur_row[pixel + rgb32_pixel_pad] = cur_row[pixelm1 + rgb32_pixel_pad]
            }

            if (i == end) {
              return
            } else {
              stopidx = i + channel.state.waitcnt
              rc = 1
              break
            }
          }
        }

        a = golomb_decoding_8bpc(channel.buckets_ptrs[correlate_row.row[i - 1]].bestcode, this.io_word)
        correlate_row.row[i] = a.rc
        cur_row[pixel + rgb32_pixel_pad] = (family_8bpc.xlatL2U[a.rc] + ((cur_row[pixelm1 + rgb32_pixel_pad] + prev_row[pixel + rgb32_pixel_pad]) >> 1)) & bpc_mask
        this.decode_eatbits(a.codewordlen)
      }

      if (!rc) {
        channel.state.waitcnt = stopidx - end
        return
      }
    }
  }

  quic_four_uncompress_row (channel: QuicChannel, prev_row: Uint8Array, cur_row: Uint8Array): void {
    const bpc = 8
    const bpc_mask = 0xff
    const correlate_row = channel.correlate_row
    let pos = 0
    let width = this.width

    while ((wmimax > channel.state.wmidx) && (channel.state.wmileft <= width)) {
      if (channel.state.wmileft) {
        this.quic_four_uncompress_row_seg(channel, correlate_row, prev_row, cur_row, pos,
          pos + channel.state.wmileft, bpc, bpc_mask)
        pos += channel.state.wmileft
        width -= channel.state.wmileft
      }

      channel.state.wmidx++
      channel.state.set_wm_trigger()
      channel.state.wmileft = wminext
    }

    if (width) {
      this.quic_four_uncompress_row_seg(channel, correlate_row, prev_row, cur_row, pos,
        pos + width, bpc, bpc_mask)
      if (wmimax > channel.state.wmidx) {
        channel.state.wmileft -= width
      }
    }
  }

  quic_decode (buf: Uint8Array, stride: number): boolean {
    let row: number

    switch (this.type) {
      case Constants.QUIC_IMAGE_TYPE_RGB32:
      case Constants.QUIC_IMAGE_TYPE_RGB24:
        this.channels[0].correlate_row.zero = 0
        this.channels[1].correlate_row.zero = 0
        this.channels[2].correlate_row.zero = 0
        this.quic_rgb32_uncompress_row0(buf)

        this.rows_completed++
        for (row = 1; row < this.height; row++) {
          const prev = buf
          buf = prev.subarray(stride)
          this.channels[0].correlate_row.zero = this.channels[0].correlate_row.row[0]
          this.channels[1].correlate_row.zero = this.channels[1].correlate_row.row[0]
          this.channels[2].correlate_row.zero = this.channels[2].correlate_row.row[0]
          this.quic_rgb32_uncompress_row(prev, buf)
          this.rows_completed++
        }
        break
      case Constants.QUIC_IMAGE_TYPE_RGB16:
        console.log('quic: unsupported output format\n')
        return false
      case Constants.QUIC_IMAGE_TYPE_RGBA:
        this.channels[0].correlate_row.zero = 0
        this.channels[1].correlate_row.zero = 0
        this.channels[2].correlate_row.zero = 0
        this.quic_rgb32_uncompress_row0(buf)

        this.channels[3].correlate_row.zero = 0
        this.quic_four_uncompress_row0(this.channels[3], buf)

        this.rows_completed++
        for (row = 1; row < this.height; row++) {
          const prev = buf
          buf = prev.subarray(stride)

          this.channels[0].correlate_row.zero = this.channels[0].correlate_row.row[0]
          this.channels[1].correlate_row.zero = this.channels[1].correlate_row.row[0]
          this.channels[2].correlate_row.zero = this.channels[2].correlate_row.row[0]
          this.quic_rgb32_uncompress_row(prev, buf)

          this.channels[3].correlate_row.zero = this.channels[3].correlate_row.row[0]
          this.quic_four_uncompress_row(this.channels[3], prev, buf)
          this.rows_completed++
        }
        break

      case Constants.QUIC_IMAGE_TYPE_GRAY:
        console.log('quic: unsupported output format\n')
        return false

      case Constants.QUIC_IMAGE_TYPE_INVALID:
      default:
        console.log('quic: bad image type\n')
        return false
    }
    return true
  }

  simple_quic_decode (buf: Uint8Array): Uint8Array | undefined {
    const stride = 4 /* FIXME - proper stride calc please */
    if (!this.quic_decode_begin(buf)) { return undefined }
    if (this.type != Constants.QUIC_IMAGE_TYPE_RGB32 && this.type != Constants.QUIC_IMAGE_TYPE_RGB24 &&
            this.type != Constants.QUIC_IMAGE_TYPE_RGBA) { return undefined }
    const out = new Uint8Array(this.width * this.height * 4)
    out[0] = 69
    if (this.quic_decode(out, (this.width * stride))) { return out }
    return undefined
  }
}

class SpiceQuic {
  data_size: number = 0
  outptr: Uint8Array | undefined
  type: number = 0
  width: number = 0
  height: number = 0

  from_dv (dv: DataView | SpiceDataView, at: number, mb: ArrayBuffer | ArrayBuffer[]): number {
    if (!encoder) { throw ('quic: no quic encoder') }
    this.data_size = dv.getUint32(at, true)
    at += 4
    let buf: Uint8Array
    if (Array.isArray(mb)) {
      const totalLength = mb.reduce((sum, b) => sum + b.byteLength, 0)
      buf = new Uint8Array(totalLength)
      let offset = 0
      for (const b of mb) {
        buf.set(new Uint8Array(b), offset)
        offset += b.byteLength
      }
      buf = buf.slice(at)
    } else {
      buf = new Uint8Array(mb.slice(at))
    }
    this.outptr = encoder.simple_quic_decode(buf)
    if (this.outptr) {
      this.type = encoder.type
      this.width = encoder.width
      this.height = encoder.height
    }
    at += buf.length
    return at
  }
}

function convert_spice_quic_to_web (context: CanvasRenderingContext2D, spice_quic: SpiceQuic): ImageData {
  const ret = context.createImageData(spice_quic.width, spice_quic.height)
  for (let i = 0; i < (ret.width * ret.height * 4); i += 4) {
    ret.data[i + 0] = spice_quic.outptr[i + 2]
    ret.data[i + 1] = spice_quic.outptr[i + 1]
    ret.data[i + 2] = spice_quic.outptr[i + 0]
    if (spice_quic.type !== Constants.QUIC_IMAGE_TYPE_RGBA) { ret.data[i + 3] = 255 } else { ret.data[i + 3] = 255 - spice_quic.outptr[i + 3] }
  }
  return ret
}

/* Module initialization */
if (need_init) {
  need_init = false

  family_init(family_8bpc, 8, DEFmaxclen)
  family_init(family_5bpc, 5, DEFmaxclen)
  /* init_zeroLUT */
  let i, j, k, l

  j = k = 1
  l = 8
  for (i = 0; i < 256; ++i) {
    zeroLUT[i] = l
    --k
    if (k == 0) {
      k = j
      --l
      j *= 2
    }
  }

  encoder = new QuicEncoder()

  if (!encoder) { throw ('quic: failed to create encoder') }
}

export {
  Constants,
  SpiceQuic,
  convert_spice_quic_to_web
}
