// Downloaded from http://www-cs-students.stanford.edu/~tjw/jsbn/ by Jeremy White on 6/1/2012

/*
 * Copyright (c) 2003-2005  Tom Wu
 * All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY
 * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.
 *
 * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
 * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
 * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
 * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
 * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * In addition, the following condition applies:
 *
 * All redistributions must retain an intact copy of this copyright notice
 * and disclaimer.
 */

// Basic JavaScript BN library - subset useful for RSA encryption.

// Bits per digit
let dbits: number

// JavaScript engine analysis
const canary = 0xdeadbeefcafe
const j_lm = ((canary & 0xffffff) == 0xefcafe)

// (public) Constructor
export class BigInteger {
  t: number
  s: number;
  [index: number]: number;

  static ZERO: BigInteger
  static ONE: BigInteger
  static RM: string
  static RC: number[]

  DB: number
  DM: number
  DV: number
  FV: number
  F1: number
  F2: number

  // (protected) am: Compute w_j += (x*this_i), propagate carries,
  // c is initial carry, returns final carry.
  am: (i: number, x: number, w: BigInteger, j: number, c: number, n: number) => number

  constructor (a?: any, b?: number, c?: any) {
    if (a != null) {
      if (typeof a === 'number') {
        this.fromNumber(a, b, c)
      } else if (b == null && typeof a !== 'string') {
        this.fromString(a, 256)
      } else {
        this.fromString(a, b)
      }
    }
  }

  // (protected) copy this to r
  copyTo (r: BigInteger) {
    for (let i = this.t - 1; i >= 0; --i) r[i] = this[i]
    r.t = this.t
    r.s = this.s
  }

  // (protected) set from integer value x, -DV <= x < DV
  fromInt (x: number) {
    this.t = 1
    this.s = (x < 0) ? -1 : 0
    if (x > 0) this[0] = x
    else if (x < -1) this[0] = x + this.DV
    else this.t = 0
  }

  // (protected) set from string and radix
  fromString (s: string | number[], b: number) {
    let k: number
    if (b == 16) k = 4
    else if (b == 8) k = 3
    else if (b == 256) k = 8 // byte array
    else if (b == 2) k = 1
    else if (b == 32) k = 5
    else if (b == 4) k = 2
    else {
      this.fromRadix(s as string, b)
      return
    }
    this.t = 0
    this.s = 0
    let i = s.length; let mi = false; let sh = 0
    while (--i >= 0) {
      const x = (k == 8) ? ((s as number[])[i] & 0xff) : this.intAt(s as string, i)
      if (x < 0) {
        if ((s as string).charAt(i) == '-') mi = true
        continue
      }
      mi = false
      if (sh == 0) {
        this[this.t++] = x
      } else if (sh + k > this.DB) {
        this[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh
        this[this.t++] = (x >> (this.DB - sh))
      } else {
        this[this.t - 1] |= x << sh
      }
      sh += k
      if (sh >= this.DB) sh -= this.DB
    }
    if (k == 8 && ((s as number[])[0] & 0x80) != 0) {
      this.s = -1
      if (sh > 0) this[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh
    }
    this.clamp()
    if (mi) BigInteger.ZERO.subTo(this, this)
  }

  // (protected) clamp off excess high words
  clamp () {
    const c = this.s & this.DM
    while (this.t > 0 && this[this.t - 1] == c) --this.t
  }

  // (public) return string representation in given radix
  toString (b: number): string {
    if (this.s < 0) return '-' + this.negate().toString(b)
    let k: number
    if (b == 16) k = 4
    else if (b == 8) k = 3
    else if (b == 2) k = 1
    else if (b == 32) k = 5
    else if (b == 4) k = 2
    else return this.toRadix(b)
    const km = (1 << k) - 1
    let d: number | undefined
    let i = this.t
    let p = this.DB - (i * this.DB) % k
    let result = ''
    if (i-- > 0) {
      if (p < this.DB && (d = this[i] >> p) > 0) {
        result += this.int2char(d)
      }
      while (i >= 0) {
        if (p < k) {
          d = (this[i] & ((1 << p) - 1)) << (k - p)
          d |= this[--i] >> (p += this.DB - k)
        } else {
          d = (this[i] >> (p -= k)) & km
          if (p <= 0) { p += this.DB; --i }
        }
        if (d > 0 || result.length > 0) {
          result += this.int2char(d)
        }
      }
    }
    return result.length > 0 ? result : '0'
  }

  // (public) -this
  negate (): BigInteger {
    const r = this.nbi()
    BigInteger.ZERO.subTo(this, r)
    return r
  }

  // (public) |this|
  abs (): BigInteger {
    return (this.s < 0) ? this.negate() : this
  }

  // (public) return + if this > a, - if this < a, 0 if equal
  compareTo (a: BigInteger): number {
    const r = this.s - a.s
    if (r != 0) return r
    const i = this.t
    const r2 = i - a.t
    if (r2 != 0) return r2
    for (let j = i - 1; j >= 0; j--) {
      const r3 = this[j] - a[j]
      if (r3 != 0) return r3
    }
    return 0
  }

  // (public) return the number of bits in "this"
  bitLength (): number {
    if (this.t <= 0) return 0
    return this.DB * (this.t - 1) + this.nbits(this[this.t - 1] ^ (this.s & this.DM))
  }

  // (protected) r = this << n*DB
  dlShiftTo (n: number, r: BigInteger) {
    for (let i = this.t - 1; i >= 0; --i) r[i + n] = this[i]
    for (let i = n - 1; i >= 0; --i) r[i] = 0
    r.t = this.t + n
    r.s = this.s
  }

  // (protected) r = this >> n*DB
  drShiftTo (n: number, r: BigInteger) {
    for (let i = n; i < this.t; ++i) r[i - n] = this[i]
    r.t = Math.max(this.t - n, 0)
    r.s = this.s
  }

  // (protected) r = this << n
  lShiftTo (n: number, r: BigInteger) {
    const bs = n % this.DB
    const cbs = this.DB - bs
    const bm = (1 << cbs) - 1
    const ds = Math.floor(n / this.DB)
    let c = (this.s << bs) & this.DM
    for (let i = this.t - 1; i >= 0; --i) {
      r[i + ds + 1] = (this[i] >> cbs) | c
      c = (this[i] & bm) << bs
    }
    for (let i = ds - 1; i >= 0; --i) r[i] = 0
    r[ds] = c
    r.t = this.t + ds + 1
    r.s = this.s
    r.clamp()
  }

  // (protected) r = this >> n
  rShiftTo (n: number, r: BigInteger) {
    r.s = this.s
    const ds = Math.floor(n / this.DB)
    if (ds >= this.t) { r.t = 0; return }
    const bs = n % this.DB
    const cbs = this.DB - bs
    const bm = (1 << bs) - 1
    r[0] = this[ds] >> bs
    for (let i = ds + 1; i < this.t; ++i) {
      r[i - ds - 1] |= (this[i] & bm) << cbs
      r[i - ds] = this[i] >> bs
    }
    if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs
    r.t = this.t - ds
    r.clamp()
  }

  // (protected) r = this - a
  subTo (a: BigInteger, r: BigInteger) {
    let i = 0; let c = 0; const m = Math.min(a.t, this.t)
    while (i < m) {
      c += this[i] - a[i]
      r[i++] = c & this.DM
      c >>= this.DB
    }
    if (a.t < this.t) {
      c -= a.s
      while (i < this.t) {
        c += this[i]
        r[i++] = c & this.DM
        c >>= this.DB
      }
      c += this.s
    } else {
      c += this.s
      while (i < a.t) {
        c -= a[i]
        r[i++] = c & this.DM
        c >>= this.DB
      }
      c -= a.s
    }
    r.s = (c < 0) ? -1 : 0
    if (c < -1) r[i++] = this.DV + c
    else if (c > 0) r[i++] = c
    r.t = i
    r.clamp()
  }

  // (protected) r = this * a, r != this,a (HAC 14.12)
  // "this" should be the larger one if appropriate.
  multiplyTo (a: BigInteger, r: BigInteger) {
    const x = this.abs()
    const y = a.abs()
    const i = x.t
    r.t = i + y.t
    for (let j = r.t - 1; j >= 0; --j) r[j] = 0
    for (let j = 0; j < y.t; ++j) r[j + x.t] = x.am(0, y[j], r, j, 0, x.t)
    r.s = 0
    r.clamp()
    if (this.s != a.s) BigInteger.ZERO.subTo(r, r)
  }

  // (protected) r = this^2, r != this (HAC 14.16)
  squareTo (r: BigInteger) {
    const x = this.abs()
    let i = r.t = 2 * x.t
    for (let j = i - 1; j >= 0; --j) r[j] = 0
    for (i = 0; i < x.t - 1; ++i) {
      const c = x.am(i, x[i], r, 2 * i, 0, 1)
      if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
        r[i + x.t] -= x.DV
        r[i + x.t + 1] = 1
      }
    }
    if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1)
    r.s = 0
    r.clamp()
  }

  // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
  // r != q, this != m.  q or r may be null.
  divRemTo (m: BigInteger, q: BigInteger | null, r: BigInteger | null) {
    const pm = m.abs()
    if (pm.t <= 0) return
    const pt = this.abs()
    if (pt.t < pm.t) {
      if (q != null) q.fromInt(0)
      if (r != null) this.copyTo(r)
      return
    }
    if (r == null) r = this.nbi()
    const y = this.nbi(); const ts = this.s; const ms = m.s
    const nsh = this.DB - this.nbits(pm[pm.t - 1])
    if (nsh > 0) { pm.lShiftTo(nsh, y); pt.lShiftTo(nsh, r) } else { pm.copyTo(y); pt.copyTo(r) }
    const ys = y.t
    const y0 = y[ys - 1]
    if (y0 == 0) return
    const yt = y0 * (1 << this.F1) + ((ys > 1) ? y[ys - 2] >> this.F2 : 0)
    const d1 = this.FV / yt; const d2 = (1 << this.F1) / yt; const e = 1 << this.F2
    let i = r.t; let j = i - ys; const t = (q == null) ? this.nbi() : q
    y.dlShiftTo(j, t)
    if (r.compareTo(t) >= 0) {
      r[r.t++] = 1
      r.subTo(t, r)
    }
    BigInteger.ONE.dlShiftTo(ys, t)
    t.subTo(y, y)
    while (y.t < ys) y[y.t++] = 0
    while (--j >= 0) {
      let qd = (r[--i] == y0) ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2)
      if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
        y.dlShiftTo(j, t)
        r.subTo(t, r)
        while (r[i] < --qd) r.subTo(t, r)
      }
    }
    if (q != null) {
      r.drShiftTo(ys, q)
      if (ts != ms) BigInteger.ZERO.subTo(q, q)
    }
    r.t = ys
    r.clamp()
    if (nsh > 0) r.rShiftTo(nsh, r)
    if (ts < 0) BigInteger.ZERO.subTo(r, r)
  }

  // (public) this mod a
  mod (a: BigInteger): BigInteger {
    const r = this.nbi()
    this.abs().divRemTo(a, null, r)
    if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r)
    return r
  }

  // Modular reduction using "classic" algorithm
  // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
  invDigit (): number {
    if (this.t < 1) return 0
    const x = this[0]
    if ((x & 1) == 0) return 0
    let y = x & 3
    y = (y * (2 - (x & 0xf) * y)) & 0xf
    y = (y * (2 - (x & 0xff) * y)) & 0xff
    y = (y * (2 - (((x & 0xffff) * y) & 0xffff))) & 0xffff
    y = (y * (2 - x * y % this.DV)) % this.DV
    return (y > 0) ? this.DV - y : -y
  }

  // (protected) true iff this is even
  isEven (): boolean {
    return ((this.t > 0) ? (this[0] & 1) : this.s) == 0
  }

  // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
  exp (e: number, z: any): BigInteger {
    if (e > 0xffffffff || e < 1) return BigInteger.ONE
    let r = this.nbi(); let r2 = this.nbi(); const g = z.convert(this); let i = this.nbits(e) - 1
    g.copyTo(r)
    while (--i >= 0) {
      z.sqrTo(r, r2)
      if ((e & (1 << i)) > 0) z.mulTo(r2, g, r)
      else { const t = r; r = r2; r2 = t }
    }
    return z.revert(r)
  }

  // (public) this^e % m, 0 <= e < 2^32
  modPowInt (e: number, m: BigInteger): BigInteger {
    let z
    if (e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m)
    return this.exp(e, z)
  }

  // (public) this * a
  multiply (a: BigInteger): BigInteger {
    const r = this.nbi()
    this.multiplyTo(a, r)
    return r
  }

  // (public) this + a
  add (a: BigInteger): BigInteger {
    const r = this.nbi()
    this.addTo(a, r)
    return r
  }

  // (protected) return new, unset BigInteger
  nbi (): BigInteger {
    return new BigInteger()
  }

  // returns bit length of the integer x
  nbits (x: number): number {
    let r = 1; let t: number
    if ((t = x >>> 16) != 0) { x = t; r += 16 }
    if ((t = x >> 8) != 0) { x = t; r += 8 }
    if ((t = x >> 4) != 0) { x = t; r += 4 }
    if ((t = x >> 2) != 0) { x = t; r += 2 }
    if ((t = x >> 1) != 0) { x = t; r += 1 }
    return r
  }

  // (protected) from Radix
  fromRadix (s: string, b: number) {
    this.t = 0
    this.s = 0
    let i = 0
    let isNegative = false

    // Check for negative sign
    if (s.length > 0 && s.charAt(0) === '-') {
      isNegative = true
      i = 1
    }

    // Create a temporary BigInteger to hold the base
    const base = new BigInteger(b)

    // Process each character
    for (; i < s.length; i++) {
      const c = this.intAt(s, i)
      if (c < 0 || c >= b) continue

      // Multiply current value by base
      if (this.t > 0) {
        const temp = this.nbi()
        this.multiplyTo(base, temp)
        temp.copyTo(this)
      }

      // Add the current digit
      if (this.t === 0) {
        this.fromInt(c)
      } else {
        const digit = new BigInteger(c)
        const temp = this.nbi()
        this.addTo(digit, temp)
        temp.copyTo(this)
      }
    }

    if (isNegative) {
      BigInteger.ZERO.subTo(this, this)
    }
  }

  // (protected) r = this + a
  addTo (a: BigInteger, r: BigInteger) {
    let i = 0; let c = 0; const m = Math.min(a.t, this.t)
    while (i < m) {
      c += this[i] + a[i]
      r[i++] = c & this.DM
      c >>= this.DB
    }

    if (a.t < this.t) {
      c += a.s
      while (i < this.t) {
        c += this[i]
        r[i++] = c & this.DM
        c >>= this.DB
      }
      c += this.s
    } else {
      c += this.s
      while (i < a.t) {
        c += a[i]
        r[i++] = c & this.DM
        c >>= this.DB
      }
      c += a.s
    }

    r.s = (c < 0) ? -1 : 0
    if (c > 0) {
      r[i++] = c
    } else if (c < -1) {
      r[i++] = this.DV + c
    }

    r.t = i
    r.clamp()
  }

  // (protected) to Radix
  toRadix (b: number): string {
    if (this.signum() == 0) return '0'
    const isNeg = this.signum() < 0
    const num = this.nbi()
    this.copyTo(num)
    if (isNeg) BigInteger.ZERO.subTo(num, num)
    const charBuf = []
    const q = this.nbi()
    const r = this.nbi()
    const d = new BigInteger(b)
    while (num.compareTo(d) >= 0) {
      num.divRemTo(d, q, r)
      charBuf.push(this.int2char(r[0]))
      q.copyTo(num)
    }
    charBuf.push(this.int2char(num[0]))
    if (isNeg) charBuf.push('-')
    charBuf.reverse()
    return charBuf.join('')
  }

  // (protected) signum
  signum (): number {
    if (this.s < 0) return -1
    if (this.t <= 0) return 0
    return 1
  }

  // (protected) dMultiply
  dMultiply (x: number) {
    if (this.t === 0) {
      if (x > 0) {
        this[0] = x
        this.t = 1
      }
      return
    }
    let c = 0
    for (let i = 0; i < this.t; i++) {
      const v = this[i] * x + c
      this[i] = v & this.DM
      c = v / this.DV
    }
    if (c > 0) this[this.t++] = c
    this.clamp()
  }

  // (protected) int2char
  int2char (n: number): string {
    return BigInteger.RM.charAt(n)
  }

  // (protected) intAt
  intAt (s: string, i: number): number {
    const c = BigInteger.RC[s.charCodeAt(i)]
    return (c == null) ? -1 : c
  }

  // (protected) from Number
  fromNumber (a: number, b: any, c: any) {
    this.t = 1
    this.s = (a < 0) ? -1 : 0
    if (a > 0) {
      this[0] = a
    } else if (a < -1) {
      this[0] = a + this.DV
    } else {
      this.t = 0
    }
  }
}

// Bits per digit
if (typeof navigator !== 'undefined') {
  if (j_lm && (navigator.appName == 'Microsoft Internet Explorer')) {
    dbits = 30
  } else if (j_lm && (navigator.appName != 'Netscape')) {
    dbits = 26
  } else {
    dbits = 28
  }
} else {
  // Default for non-browser environments (e.g., Node.js)
  dbits = 28
}

// am1: use a single mult and divide to get the high bits,
// max digit bits should be 26 because
// max internal value = 2*dvalue^2-2*dvalue (< 2^53)
function am1 (i: number, x: number, w: BigInteger, j: number, c: number, n: number): number {
  while (--n >= 0) {
    const v = x * this[i++] + w[j] + c
    c = Math.floor(v / 0x4000000)
    w[j++] = v & 0x3ffffff
  }
  return c
}

// am2 avoids a big mult-and-extract completely.
// Max digit bits should be <= 30 because we do bitwise ops
// on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
function am2 (i: number, x: number, w: BigInteger, j: number, c: number, n: number): number {
  const xl = x & 0x7fff; const xh = x >> 15
  while (--n >= 0) {
    let l = this[i] & 0x7fff
    const h = this[i++] >> 15
    const m = xh * l + h * xl
    l = xl * l + ((m & 0x7fff) << 15) + w[j] + (c & 0x3fffffff)
    c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30)
    w[j++] = l & 0x3fffffff
  }
  return c
}

// am3: Alternately, set max digit bits to 28 since some
// browsers slow down when dealing with 32-bit numbers.
function am3 (i: number, x: number, w: BigInteger, j: number, c: number, n: number): number {
  const xl = x & 0x3fff; const xh = x >> 14
  while (--n >= 0) {
    let l = this[i] & 0x3fff
    const h = this[i++] >> 14
    const m = xh * l + h * xl
    l = xl * l + ((m & 0x3fff) << 14) + w[j] + c
    c = (l >> 28) + (m >> 14) + xh * h
    w[j++] = l & 0xfffffff
  }
  return c
}

// Set the correct am function based on dbits
if (dbits == 26) {
  BigInteger.prototype.am = am1
} else if (dbits == 30) {
  BigInteger.prototype.am = am2
} else {
  BigInteger.prototype.am = am3
}

// Set properties on the prototype
BigInteger.prototype.DB = dbits
BigInteger.prototype.DM = ((1 << dbits) - 1)
BigInteger.prototype.DV = (1 << dbits)

const BI_FP = 52
BigInteger.prototype.FV = Math.pow(2, BI_FP)
BigInteger.prototype.F1 = BI_FP - dbits
BigInteger.prototype.F2 = 2 * dbits - BI_FP

// Digit conversions
BigInteger.RM = '0123456789abcdefghijklmnopqrstuvwxyz'
BigInteger.RC = []
let rr = '0'.charCodeAt(0)
for (let vv = 0; vv <= 9; ++vv) BigInteger.RC[rr++] = vv
rr = 'a'.charCodeAt(0)
for (let vv = 10; vv < 36; ++vv) BigInteger.RC[rr++] = vv
rr = 'A'.charCodeAt(0)
for (let vv = 10; vv < 36; ++vv) BigInteger.RC[rr++] = vv

// return new, unset BigInteger
function nbi () { return new BigInteger() }

// return bigint initialized to value
function nbv (i: number): BigInteger { const r = nbi(); r.fromInt(i); return r }

// Classic reduction
class Classic {
  m: BigInteger

  constructor (m: BigInteger) {
    this.m = m
  }

  convert (x: BigInteger): BigInteger {
    if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m)
    else return x
  }

  revert (x: BigInteger): BigInteger {
    return x
  }

  reduce (x: BigInteger) {
    x.divRemTo(this.m, null, x)
  }

  mulTo (x: BigInteger, y: BigInteger, r: BigInteger) {
    x.multiplyTo(y, r)
    this.reduce(r)
  }

  sqrTo (x: BigInteger, r: BigInteger) {
    x.squareTo(r)
    this.reduce(r)
  }
}

// Montgomery reduction
class Montgomery {
  m: BigInteger
  mp: number
  mpl: number
  mph: number
  um: number
  mt2: number

  constructor (m: BigInteger) {
    this.m = m
    this.mp = m.invDigit()
    this.mpl = this.mp & 0x7fff
    this.mph = this.mp >> 15
    this.um = (1 << (m.DB - 15)) - 1
    this.mt2 = 2 * m.t
  }

  convert (x: BigInteger): BigInteger {
    const r = nbi()
    x.abs().dlShiftTo(this.m.t, r)
    r.divRemTo(this.m, null, r)
    if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r)
    return r
  }

  revert (x: BigInteger): BigInteger {
    const r = nbi()
    x.copyTo(r)
    this.reduce(r)
    return r
  }

  reduce (x: BigInteger) {
    while (x.t <= this.mt2) x[x.t++] = 0
    for (let i = 0; i < this.m.t; ++i) {
      const j = x[i] & 0x7fff
      const u0 = (j * this.mpl + (((j * this.mph + (x[i] >> 15) * this.mpl) & this.um) << 15)) & this.m.DM
      let j2 = i + this.m.t
      x[j2] += this.m.am(0, u0, x, i, 0, this.m.t)
      while (x[j2] >= this.m.DV) { x[j2] -= this.m.DV; x[++j2]++ }
    }
    x.clamp()
    x.drShiftTo(this.m.t, x)
    if (x.compareTo(this.m) >= 0) x.subTo(this.m, x)
  }

  sqrTo (x: BigInteger, r: BigInteger) {
    x.squareTo(r)
    this.reduce(r)
  }

  mulTo (x: BigInteger, y: BigInteger, r: BigInteger) {
    x.multiplyTo(y, r)
    this.reduce(r)
  }
}

// "constants"
BigInteger.ZERO = nbv(0)
BigInteger.ONE = nbv(1)
