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

/* --------------------------------------------------------------------------------------
**  SpiceWireReader
**      This class will receive messages from a WebSocket and relay it to a given
**  callback.  It will optionally save and pass along a header, useful in processing
**  the mini message format.
**-------------------------------------------------------------------------------------- */

import { DEBUG } from './utils'

export class SpiceWireReader {
  sc: any
  callback: Function
  needed: number = 0
  size: number = 0
  buffers: ArrayBuffer[] = []
  saved_msg_header: any

  constructor (sc: any, callback: Function) {
    this.sc = sc
    this.callback = callback

    this.sc.ws.wire_reader = this
    this.sc.ws.binaryType = 'arraybuffer'
    this.sc.ws.addEventListener('message', wire_blob_catcher)
  }

  inbound (mb: ArrayBuffer): void {
    if (this.needed == 0) {
      this.buffers.push(mb)
      this.size += mb.byteLength
      return
    }

    if (this.buffers.length == 0 && mb.byteLength >= this.needed) {
      if (mb.byteLength > this.needed) {
        this.size = mb.byteLength - this.needed
        this.buffers.push(mb.slice(this.needed))
        mb = mb.slice(0, this.needed)
      }
      this.callback.call(this.sc, [mb],
        this.saved_msg_header || undefined)
    } else {
      this.buffers.push(mb)
      this.size += mb.byteLength
    }

    while (this.size >= this.needed) {
      const neededBuffers: ArrayBuffer[] = []
      let collected = 0

      while (collected < this.needed && this.buffers.length > 0) {
        const buf = this.buffers.shift()
        if (!buf) {
          return
        }

        const remaining = this.needed - collected

        if (buf.byteLength <= remaining) {
          neededBuffers.push(buf)
          collected += buf.byteLength
          this.size -= buf.byteLength
        } else {
          neededBuffers.push(buf.slice(0, remaining))
          collected += remaining
          this.size -= remaining

          this.buffers.unshift(buf.slice(remaining))
        }
      }

      this.callback.call(this.sc, neededBuffers, this.saved_msg_header || undefined)
    }
  }

  request (n: number): void {
    this.needed = n
  }

  save_header (h: any): void {
    this.saved_msg_header = h
  }

  clear_header (): void {
    this.saved_msg_header = undefined
  }
}

function wire_blob_catcher (e: MessageEvent): void {
  DEBUG > 1 && console.log('>> WebSockets.onmessage')
  const wireReader = (this as WebSocket & { wire_reader: SpiceWireReader }).wire_reader
  DEBUG > 1 && console.log('id ' + wireReader.sc.connection_id + '; type ' + wireReader.sc.type)
  wireReader.inbound(e.data as ArrayBuffer)
}
