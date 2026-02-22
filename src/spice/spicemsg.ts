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

/* ----------------------------------------------------------------------------
**  Spice messages
**      This file contains classes for passing messages to and from
**  a spice server.  This file should arguably be generated from
**  spice.proto, but it was instead put together by hand.
**-------------------------------------------------------------------------- */

import { Constants } from './enums'
import { SpiceDataView } from './spicedataview'
import { create_rsa_from_mb } from './ticket'
import {
  SpiceChannelId,
  SpiceRect,
  SpiceClip,
  SpiceCopy,
  SpiceFill,
  SpicePoint,
  SpiceSurface,
  SpicePoint16,
  SpiceCursor
} from './spicetype'
import {
  keycode_to_start_scan,
  keycode_to_end_scan
} from './utils'

class SpiceLinkHeader {
  magic: string
  major_version: number
  minor_version: number
  size: number

  constructor (a?: ArrayBuffer, at?: number) {
    this.magic = Constants.SPICE_MAGIC
    this.major_version = Constants.SPICE_VERSION_MAJOR
    this.minor_version = Constants.SPICE_VERSION_MINOR
    this.size = 0
    if (a !== undefined) { this.from_buffer(a, at) }
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.magic = ''
    for (let i = 0; i < 4; i++) { this.magic += String.fromCharCode(dv.getUint8(at + i)) }
    at += 4

    this.major_version = dv.getUint32(at, true); at += 4
    this.minor_version = dv.getUint32(at, true); at += 4
    this.size = dv.getUint32(at, true); at += 4
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    for (let i = 0; i < 4; i++) { dv.setUint8(at + i, this.magic.charCodeAt(i)) }
    at += 4

    dv.setUint32(at, this.major_version, true); at += 4
    dv.setUint32(at, this.minor_version, true); at += 4
    dv.setUint32(at, this.size, true); at += 4
  }

  buffer_size (): number {
    return 16
  }
}

class SpiceLinkMess {
  connection_id: number
  channel_type: number
  channel_id: number
  common_caps: number[]
  channel_caps: number[]

  constructor (a?: ArrayBuffer, at?: number) {
    this.connection_id = 0
    this.channel_type = 0
    this.channel_id = 0
    this.common_caps = []
    this.channel_caps = []

    if (a !== undefined) { this.from_buffer(a, at) }
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    let i: number
    const orig_at = at
    const dv = new SpiceDataView(a)
    this.connection_id = dv.getUint32(at, true); at += 4
    this.channel_type = dv.getUint8(at, true); at++
    this.channel_id = dv.getUint8(at, true); at++
    const num_common_caps = dv.getUint32(at, true); at += 4
    const num_channel_caps = dv.getUint32(at, true); at += 4
    const caps_offset = dv.getUint32(at, true); at += 4

    at = orig_at + caps_offset
    this.common_caps = []
    for (i = 0; i < num_common_caps; i++) {
      this.common_caps.unshift(dv.getUint32(at, true)); at += 4
    }

    this.channel_caps = []
    for (i = 0; i < num_channel_caps; i++) {
      this.channel_caps.unshift(dv.getUint32(at, true)); at += 4
    }
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const orig_at = at
    let i: number
    const dv = new SpiceDataView(a)
    dv.setUint32(at, this.connection_id, true); at += 4
    dv.setUint8(at, this.channel_type, true); at++
    dv.setUint8(at, this.channel_id, true); at++
    dv.setUint32(at, this.common_caps.length, true); at += 4
    dv.setUint32(at, this.channel_caps.length, true); at += 4
    dv.setUint32(at, (at - orig_at) + 4, true); at += 4

    for (i = 0; i < this.common_caps.length; i++) {
      dv.setUint32(at, this.common_caps[i], true); at += 4
    }

    for (i = 0; i < this.channel_caps.length; i++) {
      dv.setUint32(at, this.channel_caps[i], true); at += 4
    }
  }

  buffer_size (): number {
    return 18 + (4 * this.common_caps.length) + (4 * this.channel_caps.length)
  }
}

class SpiceLinkReply {
  error: number
  pub_key: any
  common_caps: number[]
  channel_caps: number[]

  constructor (a?: ArrayBuffer, at?: number) {
    this.error = 0
    this.pub_key = undefined
    this.common_caps = []
    this.channel_caps = []

    if (a !== undefined) { this.from_buffer(a, at) }
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    let i: number
    const orig_at = at
    const dv = new SpiceDataView(a)
    this.error = dv.getUint32(at, true); at += 4

    this.pub_key = create_rsa_from_mb(a, at)
    at += Constants.SPICE_TICKET_PUBKEY_BYTES

    const num_common_caps = dv.getUint32(at, true); at += 4
    const num_channel_caps = dv.getUint32(at, true); at += 4
    const caps_offset = dv.getUint32(at, true); at += 4

    at = orig_at + caps_offset
    this.common_caps = []
    for (i = 0; i < num_common_caps; i++) {
      this.common_caps.unshift(dv.getUint32(at, true)); at += 4
    }

    this.channel_caps = []
    for (i = 0; i < num_channel_caps; i++) {
      this.channel_caps.unshift(dv.getUint32(at, true)); at += 4
    }
  }
}

class SpiceLinkAuthTicket {
  auth_mechanism: number
  encrypted_data: number[] | Uint8Array | undefined

  constructor (a?: ArrayBuffer, at?: number) {
    this.auth_mechanism = 0
    this.encrypted_data = undefined
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    let i: number
    const dv = new SpiceDataView(a)
    dv.setUint32(at, this.auth_mechanism, true); at += 4
    for (i = 0; i < Constants.SPICE_TICKET_KEY_PAIR_LENGTH / 8; i++) {
      if (this.encrypted_data && i < this.encrypted_data.length) { dv.setUint8(at, this.encrypted_data[i], true) } else { dv.setUint8(at, 0, true) }
      at++
    }
  }

  buffer_size (): number {
    return 4 + (Constants.SPICE_TICKET_KEY_PAIR_LENGTH / 8)
  }
}

class SpiceLinkAuthReply {
  auth_code: number

  constructor (a?: ArrayBuffer, at?: number) {
    this.auth_code = 0
    if (a !== undefined) { this.from_buffer(a, at) }
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.auth_code = dv.getUint32(at, true); at += 4
  }

  buffer_size (): number {
    return 4
  }
}

class SpiceMiniData {
  type: number
  size: number
  data: ArrayBuffer | undefined

  constructor (a?: ArrayBuffer, at?: number) {
    this.type = 0
    this.size = 0
    this.data = undefined
    if (a !== undefined) { this.from_buffer(a, at) }
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    let i: number
    const dv = new SpiceDataView(a)
    this.type = dv.getUint16(at, true); at += 2
    this.size = dv.getUint32(at, true); at += 4
    if (a.byteLength > at) {
      this.data = a.slice(at)
      at += this.data.byteLength
    }
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    let i: number
    const dv = new SpiceDataView(a)
    dv.setUint16(at, this.type, true); at += 2
    dv.setUint32(at, this.data ? this.data.byteLength : 0, true); at += 4
    if (this.data && this.data.byteLength > 0) {
      const u8arr = new Uint8Array(this.data)
      for (i = 0; i < u8arr.length; i++, at++) { dv.setUint8(at, u8arr[i], true) }
    }
  }

  build_msg (in_type: number, extra: { buffer_size: () => number, to_buffer: (a: ArrayBuffer, at?: number) => void }): void {
    this.type = in_type
    this.size = extra.buffer_size()
    this.data = new ArrayBuffer(this.size)
    extra.to_buffer(this.data)
  }

  buffer_size (): number {
    if (this.data) { return 6 + this.data.byteLength } else { return 6 }
  }
}

class SpiceMsgChannels {
  num_of_channels: number
  channels: SpiceChannelId[]

  constructor (a?: ArrayBuffer, at?: number) {
    this.num_of_channels = 0
    this.channels = []
    if (a !== undefined) { this.from_buffer(a, at) }
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    let i: number
    const dv = new SpiceDataView(a)
    this.num_of_channels = dv.getUint32(at, true); at += 4
    for (i = 0; i < this.num_of_channels; i++) {
      const chan = new SpiceChannelId()
      at = chan.from_dv(dv, at, a)
      this.channels.push(chan)
    }
  }
}

function hasClipboardSelection (caps: number[]): boolean {
  return ((caps[0] >> Constants.VD_AGENT_CAP_CLIPBOARD_SELECTION) & 1) != 0
}

class SpiceMsgClipboardGrab {
  has_clipboard_selection: boolean
  type: number

  constructor (type: number, caps: number[]) {
    this.has_clipboard_selection = hasClipboardSelection(caps)
    this.type = type
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    if (this.has_clipboard_selection) {
      dv.setUint32(at, 0, true); at += 4
    }
    dv.setUint32(at, this.type, true); at += 4
  }

  buffer_size (): number {
    return (this.has_clipboard_selection ? 8 : 4)
  }
}

class SpiceMsgClipboardReceive {
  has_clipboard_selection: boolean
  type: number
  payload: ArrayBuffer

  constructor (agent_data: { data: ArrayBuffer }, caps: number[]) {
    this.has_clipboard_selection = hasClipboardSelection(caps)
    const dv = new DataView(agent_data.data)
    let at = (this.has_clipboard_selection ? 4 : 0)
    this.type = dv.getUint32(at, true); at += 4
    this.payload = agent_data.data.slice(at)
  }

  get_text (): string {
    return new TextDecoder('utf-8').decode(this.payload)
  }
}

class SpiceMsgClipboardRequest {
  has_clipboard_selection: boolean
  type: number

  constructor (type: number, caps: number[]) {
    this.has_clipboard_selection = hasClipboardSelection(caps)
    this.type = type
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    if (this.has_clipboard_selection) {
      dv.setUint32(at, 0, true); at += 4
    }
    dv.setUint32(at, this.type, true); at += 4
  }

  buffer_size (): number {
    return (this.has_clipboard_selection ? 8 : 4)
  }
}

class SpiceMsgClipboardSend {
  has_clipboard_selection: boolean
  type: number
  text: string

  constructor (type: number, text: string, caps: number[]) {
    this.has_clipboard_selection = hasClipboardSelection(caps)
    this.type = type
    this.text = text
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    if (this.has_clipboard_selection) {
      dv.setUint32(at, 0, true); at += 4
    }
    dv.setUint32(at, this.type, true); at += 4
    const payload = new TextEncoder().encode(this.text)
    new Uint8Array(a, at, payload.byteLength).set(payload); at += payload.byteLength
  }

  buffer_size (): number {
    const payloadLength = new TextEncoder().encode(this.text).byteLength
    return (this.has_clipboard_selection ? 8 : 4) + payloadLength
  }
}

class SpiceMsgMainInit {
  session_id: number
  display_channels_hint: number
  supported_mouse_modes: number
  current_mouse_mode: number
  agent_connected: number
  agent_tokens: number
  multi_media_time: number
  ram_hint: number

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.session_id = dv.getUint32(at, true); at += 4
    this.display_channels_hint = dv.getUint32(at, true); at += 4
    this.supported_mouse_modes = dv.getUint32(at, true); at += 4
    this.current_mouse_mode = dv.getUint32(at, true); at += 4
    this.agent_connected = dv.getUint32(at, true); at += 4
    this.agent_tokens = dv.getUint32(at, true); at += 4
    this.multi_media_time = dv.getUint32(at, true); at += 4
    this.ram_hint = dv.getUint32(at, true); at += 4
  }
}

class SpiceMsgMainMouseMode {
  supported_modes: number
  current_mode: number

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.supported_modes = dv.getUint16(at, true); at += 2
    this.current_mode = dv.getUint16(at, true); at += 2
  }
}

class SpiceMsgMainAgentData {
  protocol: number
  type: number
  opaque: number
  size: number
  data: ArrayBuffer | undefined

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.protocol = dv.getUint32(at, true); at += 4
    this.type = dv.getUint32(at, true); at += 4
    this.opaque = dv.getUint64(at, true); at += 8
    this.size = dv.getUint32(at, true); at += 4
    if (a.byteLength > at) {
      this.data = a.slice(at)
      at += this.data.byteLength
    }
  }
}

class SpiceMsgMainAgentTokens {
  num_tokens: number

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.num_tokens = dv.getUint32(at, true); at += 4
  }
}

class SpiceMsgSetAck {
  generation: number
  window: number

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.generation = dv.getUint32(at, true); at += 4
    this.window = dv.getUint32(at, true); at += 4
  }
}

class SpiceMsgcAckSync {
  generation: number

  constructor (ack: { generation: number }) {
    this.generation = ack.generation
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint32(at, this.generation, true); at += 4
  }

  buffer_size (): number {
    return 4
  }
}

class SpiceMsgcMainMouseModeRequest {
  mode: number

  constructor (mode: number) {
    this.mode = mode
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint16(at, this.mode, true); at += 2
  }

  buffer_size (): number {
    return 2
  }
}

class SpiceMsgcMainAgentStart {
  num_tokens: number

  constructor (num_tokens: number) {
    this.num_tokens = num_tokens
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint32(at, this.num_tokens, true); at += 4
  }

  buffer_size (): number {
    return 4
  }
}

class SpiceMsgcMainAgentData {
  protocol: number
  type: number
  opaque: number
  size: number
  data: { buffer_size: () => number, to_buffer: (a: ArrayBuffer, at?: number) => void }

  constructor (type: number, data: { buffer_size: () => number, to_buffer: (a: ArrayBuffer, at?: number) => void }) {
    this.protocol = Constants.VD_AGENT_PROTOCOL
    this.type = type
    this.opaque = 0
    this.size = data.buffer_size()
    this.data = data
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint32(at, this.protocol, true); at += 4
    dv.setUint32(at, this.type, true); at += 4
    dv.setUint64(at, this.opaque, true); at += 8
    dv.setUint32(at, this.size, true); at += 4
    this.data.to_buffer(a, at)
  }

  buffer_size (): number {
    return 4 + 4 + 8 + 4 + this.data.buffer_size()
  }
}

class VDAgentAnnounceCapabilities {
  request: number
  caps: number

  constructor (request: number, caps?: number) {
    if (caps) {
      this.request = request
      this.caps = caps
    } else { this.from_buffer(request as any) }
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint32(at, this.request, true); at += 4
    dv.setUint32(at, this.caps, true); at += 4
  }

  from_buffer (a: ArrayBuffer, at?: number): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.request = dv.getUint32(at, true); at += 4
    this.caps = dv.getUint32(at, true); at += 4
    return at
  }

  buffer_size (): number {
    return 8
  }
}

class VDAgentMonitorsConfig {
  num_mon: number
  flags: number
  width: number
  height: number
  depth: number
  x: number
  y: number

  constructor (flags: number, width: number, height: number, depth: number, x: number, y: number) {
    this.num_mon = 1
    this.flags = flags
    this.width = width
    this.height = height
    this.depth = depth
    this.x = x
    this.y = y
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint32(at, this.num_mon, true); at += 4
    dv.setUint32(at, this.flags, true); at += 4
    dv.setUint32(at, this.height, true); at += 4
    dv.setUint32(at, this.width, true); at += 4
    dv.setUint32(at, this.depth, true); at += 4
    dv.setUint32(at, this.x, true); at += 4
    dv.setUint32(at, this.y, true); at += 4
  }

  buffer_size (): number {
    return 28
  }
}

class VDAgentFileXferStatusMessage {
  id: number
  result: number

  constructor (data: number, result?: number) {
    if (result) {
      this.id = data
      this.result = result
    } else { this.from_buffer(data as any) }
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint32(at, this.id, true); at += 4
    dv.setUint32(at, this.result, true); at += 4
  }

  from_buffer (a: ArrayBuffer, at?: number): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.id = dv.getUint32(at, true); at += 4
    this.result = dv.getUint32(at, true); at += 4
    return at
  }

  buffer_size (): number {
    return 8
  }
}

class VDAgentFileXferStartMessage {
  id: number
  string: string

  constructor (id: number, name: string, size: number) {
    this.id = id
    this.string = '[vdagent-file-xfer]\n' + 'name=' + name + '\nsize=' + size + '\n'
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint32(at, this.id, true); at += 4
    for (let i = 0; i < this.string.length; i++, at++) { dv.setUint8(at, this.string.charCodeAt(i)) }
  }

  buffer_size (): number {
    return 4 + this.string.length + 1
  }
}

class VDAgentFileXferDataMessage {
  id: number
  size: number
  data: ArrayBuffer | undefined

  constructor (id: number, size: number, data: ArrayBuffer | undefined) {
    this.id = id
    this.size = size
    this.data = data
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint32(at, this.id, true); at += 4
    dv.setUint64(at, this.size, true); at += 8
    if (this.data && this.data.byteLength > 0) {
      const u8arr = new Uint8Array(this.data)
      for (let i = 0; i < u8arr.length; i++, at++) { dv.setUint8(at, u8arr[i]) }
    }
  }

  buffer_size (): number {
    return 12 + this.size
  }
}

class SpiceMsgNotify {
  time_stamp: number
  severity: number
  visibility: number
  what: number
  message_len: number
  message: string

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    let i: number
    const dv = new SpiceDataView(a)
    this.time_stamp = dv.getUint64(at, true); at += 8
    this.severity = dv.getUint32(at, true); at += 4
    this.visibility = dv.getUint32(at, true); at += 4
    this.what = dv.getUint32(at, true); at += 4
    this.message_len = dv.getUint32(at, true); at += 4
    this.message = ''
    for (i = 0; i < this.message_len; i++) {
      const c = dv.getUint8(at, true); at++
      this.message += String.fromCharCode(c)
    }
  }
}

class SpiceMsgcDisplayInit {
  pixmap_cache_id: number
  glz_dictionary_id: number
  pixmap_cache_size: number
  glz_dictionary_window_size: number

  constructor () {
    this.pixmap_cache_id = 1
    this.glz_dictionary_id = 0
    this.pixmap_cache_size = 10 * 1024 * 1024
    this.glz_dictionary_window_size = 0
  }

  to_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint8(at, this.pixmap_cache_id, true); at++
    dv.setUint64(at, this.pixmap_cache_size, true); at += 8
    dv.setUint8(at, this.glz_dictionary_id, true); at++
    dv.setUint32(at, this.glz_dictionary_window_size, true); at += 4
  }

  buffer_size (): number {
    return 14
  }
}

class SpiceMsgDisplayBase {
  surface_id: number
  box: SpiceRect
  clip: SpiceClip

  from_dv (dv: SpiceDataView, at: number, mb: ArrayBuffer): number {
    this.surface_id = dv.getUint32(at, true); at += 4
    this.box = new SpiceRect()
    at = this.box.from_dv(dv, at, mb)
    this.clip = new SpiceClip()
    return this.clip.from_dv(dv, at, mb)
  }
}

class SpiceMsgDisplayDrawCopy {
  base: SpiceMsgDisplayBase
  data: SpiceCopy

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.base = new SpiceMsgDisplayBase()
    at = this.base.from_dv(dv, at, a)
    this.data = new SpiceCopy()
    return this.data.from_dv(dv, at, a)
  }
}

class SpiceMsgDisplayDrawFill {
  base: SpiceMsgDisplayBase
  data: SpiceFill

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.base = new SpiceMsgDisplayBase()
    at = this.base.from_dv(dv, at, a)
    this.data = new SpiceFill()
    return this.data.from_dv(dv, at, a)
  }
}

class SpiceMsgDisplayCopyBits {
  base: SpiceMsgDisplayBase
  src_pos: SpicePoint

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.base = new SpiceMsgDisplayBase()
    at = this.base.from_dv(dv, at, a)
    this.src_pos = new SpicePoint()
    return this.src_pos.from_dv(dv, at, a)
  }
}

class SpiceMsgSurfaceCreate {
  surface: SpiceSurface

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.surface = new SpiceSurface()
    return this.surface.from_dv(dv, at, a)
  }
}

class SpiceMsgSurfaceDestroy {
  surface_id: number

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.surface_id = dv.getUint32(at, true); at += 4
  }
}

class SpiceMsgInputsInit {
  keyboard_modifiers: number

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.keyboard_modifiers = dv.getUint16(at, true); at += 2
    return at
  }
}

class SpiceMsgInputsKeyModifiers {
  keyboard_modifiers: number

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.keyboard_modifiers = dv.getUint16(at, true); at += 2
    return at
  }
}

class SpiceMsgCursorInit {
  position: SpicePoint16
  trail_length: number
  trail_frequency: number
  visible: number
  cursor: SpiceCursor

  constructor (a: ArrayBuffer, at?: number, mb?: ArrayBuffer) {
    this.from_buffer(a, at, mb)
  }

  from_buffer (a: ArrayBuffer, at?: number, mb?: ArrayBuffer): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.position = new SpicePoint16()
    at = this.position.from_dv(dv, at, mb)
    this.trail_length = dv.getUint16(at, true); at += 2
    this.trail_frequency = dv.getUint16(at, true); at += 2
    this.visible = dv.getUint8(at, true); at++
    this.cursor = new SpiceCursor()
    return this.cursor.from_dv(dv, at, a)
  }
}

class SpiceMsgPlaybackData {
  time: number
  data: ArrayBuffer | undefined

  constructor (a: ArrayBuffer, at?: number, mb?: ArrayBuffer) {
    this.from_buffer(a, at, mb)
  }

  from_buffer (a: ArrayBuffer, at?: number, mb?: ArrayBuffer): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.time = dv.getUint32(at, true); at += 4
    if (a.byteLength > at) {
      this.data = a.slice(at)
      at += this.data.byteLength
    }
    return at
  }
}

class SpiceMsgPlaybackMode {
  time: number
  mode: number
  data: ArrayBuffer | undefined

  constructor (a: ArrayBuffer, at?: number, mb?: ArrayBuffer) {
    this.from_buffer(a, at, mb)
  }

  from_buffer (a: ArrayBuffer, at?: number, mb?: ArrayBuffer): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.time = dv.getUint32(at, true); at += 4
    this.mode = dv.getUint16(at, true); at += 2
    if (a.byteLength > at) {
      this.data = a.slice(at)
      at += this.data.byteLength
    }
    return at
  }
}

class SpiceMsgPlaybackStart {
  channels: number
  format: number
  frequency: number
  time: number

  constructor (a: ArrayBuffer, at?: number, mb?: ArrayBuffer) {
    this.from_buffer(a, at, mb)
  }

  from_buffer (a: ArrayBuffer, at?: number, mb?: ArrayBuffer): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.channels = dv.getUint32(at, true); at += 4
    this.format = dv.getUint16(at, true); at += 2
    this.frequency = dv.getUint32(at, true); at += 4
    this.time = dv.getUint32(at, true); at += 4
    return at
  }
}

class SpiceMsgCursorSet {
  position: SpicePoint16
  visible: number
  cursor: SpiceCursor

  constructor (a: ArrayBuffer, at?: number, mb?: ArrayBuffer) {
    this.from_buffer(a, at, mb)
  }

  from_buffer (a: ArrayBuffer, at?: number, mb?: ArrayBuffer): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.position = new SpicePoint16()
    at = this.position.from_dv(dv, at, mb)
    this.visible = dv.getUint8(at, true); at++
    this.cursor = new SpiceCursor()
    return this.cursor.from_dv(dv, at, a)
  }
}

class SpiceMsgcMousePosition {
  display_id: number
  buttons_state: number
  x: number
  y: number

  constructor (sc: { buttons_state: number, mousex: number, mousey: number }, e?: { offsetX: number, offsetY: number }) {
    // FIXME - figure out how to correctly compute display_id
    this.display_id = 0
    this.buttons_state = sc.buttons_state
    if (e) {
      this.x = e.offsetX
      this.y = e.offsetY

      sc.mousex = e.offsetX
      sc.mousey = e.offsetY
    } else {
      this.x = this.y = this.buttons_state = 0
    }
  }

  to_buffer (a: ArrayBuffer, at?: number): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint32(at, this.x, true); at += 4
    dv.setUint32(at, this.y, true); at += 4
    dv.setUint16(at, this.buttons_state, true); at += 2
    dv.setUint8(at, this.display_id, true); at += 1
    return at
  }

  buffer_size (): number {
    return 11
  }
}

class SpiceMsgcMouseMotion {
  display_id: number
  buttons_state: number
  x: number
  y: number

  constructor (sc: { buttons_state: number, mousex: number, mousey: number }, e?: { offsetX: number, offsetY: number }) {
    // FIXME - figure out how to correctly compute display_id
    this.display_id = 0
    this.buttons_state = sc.buttons_state
    if (e) {
      this.x = e.offsetX
      this.y = e.offsetY

      if (sc.mousex !== undefined) {
        this.x -= sc.mousex
        this.y -= sc.mousey
      }
      sc.mousex = e.offsetX
      sc.mousey = e.offsetY
    } else {
      this.x = this.y = this.buttons_state = 0
    }
  }

  to_buffer: (a: ArrayBuffer, at?: number) => number = SpiceMsgcMousePosition.prototype.to_buffer
  buffer_size: () => number = SpiceMsgcMousePosition.prototype.buffer_size
}

class SpiceMsgcMousePress {
  button: number
  buttons_state: number

  constructor (sc: { buttons_state: number }, e?: { button: number }) {
    if (e) {
      this.button = e.button + 1
      this.buttons_state = 1 << e.button
      sc.buttons_state = this.buttons_state
    } else {
      this.button = Constants.SPICE_MOUSE_BUTTON_LEFT
      this.buttons_state = Constants.SPICE_MOUSE_BUTTON_MASK_LEFT
    }
  }

  to_buffer (a: ArrayBuffer, at?: number): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint8(at, this.button, true); at++
    dv.setUint16(at, this.buttons_state, true); at += 2
    return at
  }

  buffer_size (): number {
    return 3
  }
}

class SpiceMsgcMouseRelease {
  button: number
  buttons_state: number

  constructor (sc: { buttons_state: number }, e?: { button: number }) {
    if (e) {
      this.button = e.button + 1
      this.buttons_state = 0
      sc.buttons_state = this.buttons_state
    } else {
      this.button = Constants.SPICE_MOUSE_BUTTON_LEFT
      this.buttons_state = 0
    }
  }

  to_buffer: (a: ArrayBuffer, at?: number) => number = SpiceMsgcMousePress.prototype.to_buffer
  buffer_size: () => number = SpiceMsgcMousePress.prototype.buffer_size
}

class SpiceMsgcKeyDown {
  code: number

  constructor (e?: { keyCode: number, code: string }) {
    if (e) {
      this.code = keycode_to_start_scan(e.keyCode, e.code)
    } else {
      this.code = 0
    }
  }

  to_buffer (a: ArrayBuffer, at?: number): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint32(at, this.code, true); at += 4
    return at
  }

  buffer_size (): number {
    return 4
  }
}

class SpiceMsgcKeyUp {
  code: number

  constructor (e?: { keyCode: number, code: string }) {
    if (e) {
      this.code = keycode_to_end_scan(e.keyCode, e.code)
    } else {
      this.code = 0
    }
  }

  to_buffer: (a: ArrayBuffer, at?: number) => number = SpiceMsgcKeyDown.prototype.to_buffer
  buffer_size: () => number = SpiceMsgcKeyDown.prototype.buffer_size
}

class SpiceMsgDisplayStreamCreate {
  surface_id: number
  id: number
  flags: number
  codec_type: number
  stamp: number
  stream_width: number
  stream_height: number
  src_width: number
  src_height: number
  dest: SpiceRect
  clip: SpiceClip

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.surface_id = dv.getUint32(at, true); at += 4
    this.id = dv.getUint32(at, true); at += 4
    this.flags = dv.getUint8(at, true); at += 1
    this.codec_type = dv.getUint8(at, true); at += 1
    this.stamp = dv.getUint64(at, true); at += 8
    this.stream_width = dv.getUint32(at, true); at += 4
    this.stream_height = dv.getUint32(at, true); at += 4
    this.src_width = dv.getUint32(at, true); at += 4
    this.src_height = dv.getUint32(at, true); at += 4

    this.dest = new SpiceRect()
    at = this.dest.from_dv(dv, at, a)
    this.clip = new SpiceClip()
    this.clip.from_dv(dv, at, a)
  }
}

class SpiceStreamDataHeader {
  id: number
  multi_media_time: number

  from_dv (dv: SpiceDataView, at: number, mb: ArrayBuffer): number {
    this.id = dv.getUint32(at, true); at += 4
    this.multi_media_time = dv.getUint32(at, true); at += 4
    return at
  }
}

class SpiceMsgDisplayStreamData {
  base: SpiceStreamDataHeader
  data_size: number
  data: Uint8Array

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.base = new SpiceStreamDataHeader()
    at = this.base.from_dv(dv, at, a)
    this.data_size = dv.getUint32(at, true); at += 4
    this.data = dv.u8.subarray(at, at + this.data_size)
  }
}

class SpiceMsgDisplayStreamDataSized {
  base: SpiceStreamDataHeader
  width: number
  height: number
  dest: SpiceRect
  data_size: number
  data: Uint8Array

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.base = new SpiceStreamDataHeader()
    at = this.base.from_dv(dv, at, a)
    this.width = dv.getUint32(at, true); at += 4
    this.height = dv.getUint32(at, true); at += 4
    this.dest = new SpiceRect()
    at = this.dest.from_dv(dv, at, a)
    this.data_size = dv.getUint32(at, true); at += 4
    this.data = dv.u8.subarray(at, at + this.data_size)
  }
}

class SpiceMsgDisplayStreamClip {
  id: number
  clip: SpiceClip

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.id = dv.getUint32(at, true); at += 4
    this.clip = new SpiceClip()
    this.clip.from_dv(dv, at, a)
  }
}

class SpiceMsgDisplayStreamDestroy {
  id: number

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.id = dv.getUint32(at, true); at += 4
  }
}

class SpiceMsgDisplayStreamActivateReport {
  stream_id: number
  unique_id: number
  max_window_size: number
  timeout_ms: number

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    this.stream_id = dv.getUint32(at, true); at += 4
    this.unique_id = dv.getUint32(at, true); at += 4
    this.max_window_size = dv.getUint32(at, true); at += 4
    this.timeout_ms = dv.getUint32(at, true); at += 4
  }
}

class SpiceMsgcDisplayStreamReport {
  stream_id: number
  unique_id: number
  start_frame_mm_time: number
  end_frame_mm_time: number
  num_frames: number
  num_drops: number
  last_frame_delay: number
  audio_delay: number

  constructor (stream_id: number, unique_id: number) {
    this.stream_id = stream_id
    this.unique_id = unique_id
    this.start_frame_mm_time = 0
    this.end_frame_mm_time = 0
    this.num_frames = 0
    this.num_drops = 0
    this.last_frame_delay = 0

    // TODO - Implement audio delay
    this.audio_delay = -1
  }

  to_buffer (a: ArrayBuffer, at?: number): number {
    at = at || 0
    const dv = new SpiceDataView(a)
    dv.setUint32(at, this.stream_id, true); at += 4
    dv.setUint32(at, this.unique_id, true); at += 4
    dv.setUint32(at, this.start_frame_mm_time, true); at += 4
    dv.setUint32(at, this.end_frame_mm_time, true); at += 4
    dv.setUint32(at, this.num_frames, true); at += 4
    dv.setUint32(at, this.num_drops, true); at += 4
    dv.setUint32(at, this.last_frame_delay, true); at += 4
    dv.setUint32(at, this.audio_delay, true); at += 4
    return at
  }

  buffer_size (): number {
    return 8 * 4
  }
}

class SpiceMsgDisplayInvalList {
  count: number
  resources: Array<{ type: number, id: number }>

  constructor (a: ArrayBuffer, at?: number) {
    this.count = 0
    this.resources = []
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    let i: number
    at = at || 0
    const dv = new SpiceDataView(a)
    this.count = dv.getUint16(at, true); at += 2
    for (i = 0; i < this.count; i++) {
      this.resources[i] = {}
      this.resources[i].type = dv.getUint8(at, true); at++
      this.resources[i].id = dv.getUint64(at, true); at += 8
    }
  }
}

class SpiceMsgPortInit {
  opened: number
  name: ArrayBuffer

  constructor (a: ArrayBuffer, at?: number) {
    this.from_buffer(a, at)
  }

  from_buffer (a: ArrayBuffer, at?: number): void {
    at = at || 0
    const dv = new SpiceDataView(a)
    const namesize = dv.getUint32(at, true); at += 4
    const offset = dv.getUint32(at, true); at += 4
    this.opened = dv.getUint8(at, true); at += 1
    this.name = a.slice(offset, offset + namesize - 1)
  }
}

export {
  SpiceLinkHeader,
  SpiceLinkMess,
  SpiceLinkReply,
  SpiceLinkAuthTicket,
  SpiceLinkAuthReply,
  SpiceMiniData,
  SpiceMsgChannels,
  SpiceMsgClipboardGrab,
  SpiceMsgClipboardReceive,
  SpiceMsgClipboardRequest,
  SpiceMsgClipboardSend,
  SpiceMsgMainInit,
  SpiceMsgMainMouseMode,
  SpiceMsgMainAgentData,
  SpiceMsgMainAgentTokens,
  SpiceMsgSetAck,
  SpiceMsgcAckSync,
  SpiceMsgcMainMouseModeRequest,
  SpiceMsgcMainAgentStart,
  SpiceMsgcMainAgentData,
  VDAgentAnnounceCapabilities,
  VDAgentMonitorsConfig,
  VDAgentFileXferStatusMessage,
  VDAgentFileXferStartMessage,
  VDAgentFileXferDataMessage,
  SpiceMsgNotify,
  SpiceMsgcDisplayInit,
  SpiceMsgDisplayBase,
  SpiceMsgDisplayDrawCopy,
  SpiceMsgDisplayDrawFill,
  SpiceMsgDisplayCopyBits,
  SpiceMsgSurfaceCreate,
  SpiceMsgSurfaceDestroy,
  SpiceMsgInputsInit,
  SpiceMsgInputsKeyModifiers,
  SpiceMsgCursorInit,
  SpiceMsgPlaybackData,
  SpiceMsgPlaybackMode,
  SpiceMsgPlaybackStart,
  SpiceMsgCursorSet,
  SpiceMsgcMousePosition,
  SpiceMsgcMouseMotion,
  SpiceMsgcMousePress,
  SpiceMsgcMouseRelease,
  SpiceMsgcKeyDown,
  SpiceMsgcKeyUp,
  SpiceMsgDisplayStreamCreate,
  SpiceStreamDataHeader,
  SpiceMsgDisplayStreamData,
  SpiceMsgDisplayStreamDataSized,
  SpiceMsgDisplayStreamClip,
  SpiceMsgDisplayStreamDestroy,
  SpiceMsgDisplayStreamActivateReport,
  SpiceMsgcDisplayStreamReport,
  SpiceMsgDisplayInvalList,
  SpiceMsgPortInit
}
