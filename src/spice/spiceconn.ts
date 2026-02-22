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
**  SpiceConn
**      This is the base Javascript class for establishing and
**  managing a connection to a Spice Server.
**  It is used to provide core functionality to the Spice main,
**  display, inputs, and cursor channels.  See main.js for
**  usage.
**-------------------------------------------------------------------------- */

import { Constants } from './enums'
import { SpiceWireReader } from './wire'
import { SpiceDataView } from './spicedataview'
import {
  SpiceLinkHeader,
  SpiceLinkMess,
  SpiceLinkReply,
  SpiceLinkAuthTicket,
  SpiceLinkAuthReply,
  SpiceMiniData,
  SpiceMsgcDisplayInit,
  SpiceMsgSetAck,
  SpiceMsgcAckSync,
  SpiceMsgNotify
} from './spicemsg'
import { DEBUG, hexdump_buffer } from './utils'
import * as Webm from './webm'
import { rsa_encrypt } from './ticket'

export type SpiceEventType = 'connection_status' | 'keyboard_modifiers'

export interface SpiceEventHandlers {
  connection_status: (status: string) => void
  keyboard_modifiers: (modifiers: { num_lock: boolean, caps_lock: boolean, scroll_lock: boolean }) => void
}

interface SpiceWebSocket extends WebSocket {
  parent: SpiceConn
}

export class SpiceConn {
  ws: SpiceWebSocket
  connection_id: number
  type: number
  chan_id: number
  parent?: SpiceConn
  message_id?: string
  password?: string
  screen_id?: string
  dump_id?: string
  onerror?: (error: Error) => void
  onsuccess?: (message: string) => void
  onagent?: (conn: SpiceConn) => void
  state?: string
  wire_reader: SpiceWireReader
  messages_sent: number
  warnings: { [key: number]: boolean }
  reply_hdr?: SpiceLinkHeader
  reply_link?: SpiceLinkReply
  auth_reply?: SpiceLinkAuthReply
  ack_window?: number
  msgs_until_ack?: number
  timeout?: number
  inputs?: any
  private event_handlers: Map<SpiceEventType, Set<Function>>

  relative_now (): number {
    return 0
  }

  send_clipboard_grab (): void {}

  constructor (o: any) {
    if (o === undefined || o.uri === undefined || !o.uri) { throw new Error('You must specify a uri') }

    this.ws = new WebSocket(o.uri, 'binary') as SpiceWebSocket

    if (!this.ws.binaryType) { throw new Error("WebSocket doesn't support binaryType.  Try a different browser.") }

    this.connection_id = o.connection_id !== undefined ? o.connection_id : 0
    this.type = o.type !== undefined ? o.type : Constants.SPICE_CHANNEL_MAIN
    this.chan_id = o.chan_id !== undefined ? o.chan_id : 0
    if (o.parent !== undefined) {
      this.parent = o.parent
      this.message_id = o.parent.message_id
      this.password = o.parent.password
    }
    if (o.screen_id !== undefined) { this.screen_id = o.screen_id }
    if (o.dump_id !== undefined) { this.dump_id = o.dump_id }
    if (o.message_id !== undefined) { this.message_id = o.message_id }
    if (o.password !== undefined) { this.password = o.password }
    if (o.onerror !== undefined) { this.onerror = o.onerror }
    if (o.onsuccess !== undefined) { this.onsuccess = o.onsuccess }
    if (o.onagent !== undefined) { this.onagent = o.onagent }

    this.state = 'connecting'
    this.ws.parent = this
    this.wire_reader = new SpiceWireReader(this, this.process_inbound.bind(this))
    this.messages_sent = 0
    this.warnings = []
    this.event_handlers = new Map()
    this.emit('connection_status', 'connecting')

    this.ws.addEventListener('open', function (this: SpiceWebSocket, e) {
      DEBUG > 0 && console.log('>> WebSockets.onopen')
      DEBUG > 0 && console.log('id ' + this.parent.connection_id + '; type ' + this.parent.type)

      /***********************************************************************
            **          WHERE IT ALL REALLY BEGINS
            ***********************************************************************/
      this.parent.send_hdr()
      this.parent.wire_reader.request(SpiceLinkHeader.prototype.buffer_size())
      this.parent.state = 'start'
      this.parent.emit('connection_status', 'connecting')
    })
    this.ws.addEventListener('error', function (this: SpiceWebSocket, e) {
      const url = 'url' in e.target ? (e.target as WebSocket).url : 'unknown'
      this.parent.log_err("WebSocket error: Can't connect to websocket on URL: " + url)
      this.parent.state = 'error'
      this.parent.emit('connection_status', 'error')
      this.parent.report_error(new Error('WebSocket connection error'))
    })
    this.ws.addEventListener('close', function (this: SpiceWebSocket, e: CloseEvent) {
      DEBUG > 0 && console.log('>> WebSockets.onclose')
      DEBUG > 0 && console.log('id ' + this.parent.connection_id + '; type ' + this.parent.type)
      DEBUG > 0 && console.log(e)
      if (this.parent.state != 'closing' && this.parent.state != 'error' && this.parent.onerror !== undefined) {
        let err: Error
        if (this.parent.state == 'connecting') { err = new Error('Connection refused.') } else if (this.parent.state == 'start' || this.parent.state == 'link') { err = new Error('Unexpected protocol mismatch.') } else if (this.parent.state == 'ticket') { err = new Error('Bad password.') } else { err = new Error('Unexpected close while ' + this.parent.state) }

        this.parent.onerror(err)
        this.parent.log_err(err.toString())
      }
      this.parent.emit('connection_status', 'disconnected')
    })

    if (this.ws.readyState == 2 || this.ws.readyState == 3) { throw new Error('Unable to connect to ' + o.uri) }

    this.timeout = window.setTimeout(spiceconn_timeout, Constants.SPICE_CONNECT_TIMEOUT, this)
  }

  send_hdr (): void {
    const hdr = new SpiceLinkHeader()
    const msg = new SpiceLinkMess()

    msg.connection_id = this.connection_id
    msg.channel_type = this.type
    msg.channel_id = this.chan_id

    msg.common_caps.push(
      (1 << Constants.SPICE_COMMON_CAP_PROTOCOL_AUTH_SELECTION) |
            (1 << Constants.SPICE_COMMON_CAP_MINI_HEADER)
    )

    if (msg.channel_type == Constants.SPICE_CHANNEL_PLAYBACK) {
      var caps = 0
      if ('MediaSource' in window && MediaSource.isTypeSupported(Webm.Constants.SPICE_PLAYBACK_CODEC)) { caps |= (1 << Constants.SPICE_PLAYBACK_CAP_OPUS) }
      msg.channel_caps.push(caps)
    } else if (msg.channel_type == Constants.SPICE_CHANNEL_MAIN) {
      msg.channel_caps.push(
        (1 << Constants.SPICE_MAIN_CAP_AGENT_CONNECTED_TOKENS)
      )
    } else if (msg.channel_type == Constants.SPICE_CHANNEL_DISPLAY) {
      var caps = (1 << Constants.SPICE_DISPLAY_CAP_SIZED_STREAM) |
                        (1 << Constants.SPICE_DISPLAY_CAP_STREAM_REPORT) |
                        (1 << Constants.SPICE_DISPLAY_CAP_MULTI_CODEC) |
                        (1 << Constants.SPICE_DISPLAY_CAP_CODEC_MJPEG)
      if ('MediaSource' in window && MediaSource.isTypeSupported(Webm.Constants.SPICE_VP8_CODEC)) { caps |= (1 << Constants.SPICE_DISPLAY_CAP_CODEC_VP8) }
      msg.channel_caps.push(caps)
    }

    hdr.size = msg.buffer_size()

    const mb = new ArrayBuffer(hdr.buffer_size() + msg.buffer_size())
    hdr.to_buffer(mb)
    msg.to_buffer(mb, hdr.buffer_size())

    DEBUG > 1 && console.log('Sending header:')
    DEBUG > 2 && hexdump_buffer(mb)
    this.ws.send(mb)
  }

  send_ticket (ticket: number[]): void {
    const hdr = new SpiceLinkAuthTicket()
    hdr.auth_mechanism = Constants.SPICE_COMMON_CAP_AUTH_SPICE
    // FIXME - we need to implement RSA to make this work right
    hdr.encrypted_data = ticket
    const mb = new ArrayBuffer(hdr.buffer_size())

    hdr.to_buffer(mb)
    DEBUG > 1 && console.log('Sending ticket:')
    DEBUG > 2 && hexdump_buffer(mb)
    this.ws.send(mb)
  }

  send_msg (msg: any): void {
    const mb = new ArrayBuffer(msg.buffer_size())
    msg.to_buffer(mb)
    this.messages_sent++
    DEBUG > 0 && console.log('>> hdr ' + this.channel_type() + ' type ' + msg.type + ' size ' + mb.byteLength)
    DEBUG > 2 && hexdump_buffer(mb)
    this.ws.send(mb)
  }

  process_inbound (mb: ArrayBuffer | ArrayBuffer[], saved_header: any): void {
    const totalLength = Array.isArray(mb) ? mb.reduce((sum, buf) => sum + buf.byteLength, 0) : mb.byteLength
    DEBUG > 2 && console.log(this.type + ': processing message of size ' + totalLength + '; state is ' + this.state)
    if (this.state == 'ready') {
      if (saved_header == undefined) {
        const msg = new SpiceMiniData(mb)

        if (msg.type > 500) {
          if (DEBUG > 0) {
            if (typeof alert === 'function') {
              alert('Something has gone very wrong; we think we have message of type ' + msg.type)
            }
            debugger
          }
        }

        if (msg.size == 0) {
          this.process_message(msg)
          this.wire_reader.request(SpiceMiniData.prototype.buffer_size())
        } else {
          this.wire_reader.request(msg.size)
          this.wire_reader.save_header(msg)
        }
      } else {
        saved_header.data = Array.isArray(mb) ? new SpiceDataView(mb).sliceData(0) : mb
        this.process_message(saved_header)
        this.wire_reader.request(SpiceMiniData.prototype.buffer_size())
        this.wire_reader.save_header(undefined)
      }
    } else if (this.state == 'start') {
      this.reply_hdr = new SpiceLinkHeader(mb)
      if (this.reply_hdr.magic != Constants.SPICE_MAGIC) {
        this.state = 'error'
        var e = new Error('Error: magic mismatch: ' + this.reply_hdr.magic)
        this.report_error(e)
      } else {
        this.wire_reader.request(this.reply_hdr.size)
        this.state = 'link'
      }
    } else if (this.state == 'link') {
      this.reply_link = new SpiceLinkReply(mb)
      if (this.reply_link.error) {
        this.state = 'error'
        var e = new Error('Error: reply link error ' + this.reply_link.error)
        this.report_error(e)
      } else {
        this.send_ticket(rsa_encrypt(this.reply_link.pub_key, this.password + String.fromCharCode(0)))
        this.state = 'ticket'
        this.wire_reader.request(SpiceLinkAuthReply.prototype.buffer_size())
      }
    } else if (this.state == 'ticket') {
      this.auth_reply = new SpiceLinkAuthReply(mb)
      if (this.auth_reply.auth_code == Constants.SPICE_LINK_ERR_OK) {
        DEBUG > 0 && console.log(this.type + ': Connected')

        if (this.type == Constants.SPICE_CHANNEL_DISPLAY) {
          const dinit = new SpiceMsgcDisplayInit()
          const reply = new SpiceMiniData()
          reply.build_msg(Constants.SPICE_MSGC_DISPLAY_INIT, dinit)
          DEBUG > 0 && console.log('Request display init')
          this.send_msg(reply)
        }
        this.state = 'ready'
        this.emit('connection_status', 'connected')
        this.wire_reader.request(SpiceMiniData.prototype.buffer_size())
        if (this.timeout) {
          window.clearTimeout(this.timeout)
          delete this.timeout
        }
      } else {
        this.state = 'error'
        this.emit('connection_status', 'error')
        if (this.auth_reply.auth_code == Constants.SPICE_LINK_ERR_PERMISSION_DENIED) {
          var e = new Error('Permission denied.')
        } else {
          var e = new Error('Unexpected link error ' + this.auth_reply.auth_code)
        }
        this.report_error(e)
      }
    }
  }

  process_common_messages (msg: any): boolean {
    if (msg.type == Constants.SPICE_MSG_SET_ACK) {
      const ack = new SpiceMsgSetAck(msg.data)
      // FIXME - what to do with generation?
      this.ack_window = ack.window
      DEBUG > 1 && console.log(this.type + ': set ack to ' + ack.window)
      this.msgs_until_ack = this.ack_window
      const ackack = new SpiceMsgcAckSync(ack)
      const reply = new SpiceMiniData()
      reply.build_msg(Constants.SPICE_MSGC_ACK_SYNC, ackack)
      this.send_msg(reply)
      return true
    }

    if (msg.type == Constants.SPICE_MSG_PING) {
      DEBUG > 1 && console.log('ping!')
      const pong = new SpiceMiniData()
      pong.type = Constants.SPICE_MSGC_PONG
      if (msg.data) {
        pong.data = msg.data.slice(0, 12)
      }
      pong.size = pong.buffer_size()
      this.send_msg(pong)
      return true
    }

    if (msg.type == Constants.SPICE_MSG_NOTIFY) {
      // FIXME - Visibility + what
      const notify = new SpiceMsgNotify(msg.data)
      if (notify.severity == Constants.SPICE_NOTIFY_SEVERITY_ERROR) { this.log_err(notify.message) } else if (notify.severity == Constants.SPICE_NOTIFY_SEVERITY_WARN) { this.log_warn(notify.message) } else { this.log_info(notify.message) }
      return true
    }

    return false
  }

  process_message (msg: any): boolean {
    let rc: boolean
    const start = Date.now()
    DEBUG > 0 && console.log('<< hdr ' + this.channel_type() + ' type ' + msg.type + ' size ' + (msg.data && msg.data.byteLength))
    rc = this.process_common_messages(msg)
    if (!rc) {
      if ((this as any).process_channel_message) {
        rc = (this as any).process_channel_message(msg)
        if (!rc) { this.log_warn(this.channel_type() + ': Unknown message type ' + msg.type + '!') }
      } else { this.log_err(this.channel_type() + ': No message handlers for this channel; message ' + msg.type) }
    }

    if (this.msgs_until_ack !== undefined && this.ack_window) {
      this.msgs_until_ack--
      if (this.msgs_until_ack <= 0) {
        this.msgs_until_ack = this.ack_window
        const ack = new SpiceMiniData()
        ack.type = Constants.SPICE_MSGC_ACK
        this.send_msg(ack)
        DEBUG > 1 && console.log(this.type + ': sent ack')
      }
    }

    const delta = Date.now() - start
    if (DEBUG > 0 || delta > Webm.Constants.GAP_DETECTION_THRESHOLD) { console.log('delta ' + this.channel_type() + ':' + msg.type + ' ' + delta) }
    return rc
  }

  channel_type (): string {
    if (this.type == Constants.SPICE_CHANNEL_MAIN) { return 'main' } else if (this.type == Constants.SPICE_CHANNEL_DISPLAY) { return 'display' } else if (this.type == Constants.SPICE_CHANNEL_INPUTS) { return 'inputs' } else if (this.type == Constants.SPICE_CHANNEL_CURSOR) { return 'cursor' } else if (this.type == Constants.SPICE_CHANNEL_PLAYBACK) { return 'playback' } else if (this.type == Constants.SPICE_CHANNEL_RECORD) { return 'record' } else if (this.type == Constants.SPICE_CHANNEL_TUNNEL) { return 'tunnel' } else if (this.type == Constants.SPICE_CHANNEL_SMARTCARD) { return 'smartcard' } else if (this.type == Constants.SPICE_CHANNEL_USBREDIR) { return 'usbredir' } else if (this.type == Constants.SPICE_CHANNEL_PORT) { return 'port' } else if (this.type == Constants.SPICE_CHANNEL_WEBDAV) { return 'webdav' }
    return 'unknown-' + this.type
  }

  log_info (...args: string[]): void {
    const msg = args.join(' ')
    console.log(msg)
    if (this.message_id) {
      const p = document.createElement('p')
      p.appendChild(document.createTextNode(msg))
      p.className += 'spice-message-info'
      const elem = document.getElementById(this.message_id)
      if (elem) {
        elem.appendChild(p)
      }
    }
  }

  log_warn (...args: string[]): void {
    const msg = args.join(' ')
    console.log('WARNING: ' + msg)
    if (this.message_id) {
      const p = document.createElement('p')
      p.appendChild(document.createTextNode(msg))
      p.className += 'spice-message-warning'
      const elem = document.getElementById(this.message_id)
      if (elem) {
        elem.appendChild(p)
      }
    }
  }

  log_err (...args: string[]): void {
    const msg = args.join(' ')
    console.log('ERROR: ' + msg)
    if (this.message_id) {
      const p = document.createElement('p')
      p.appendChild(document.createTextNode(msg))
      p.className += 'spice-message-error'
      const elem = document.getElementById(this.message_id)
      if (elem) {
        elem.appendChild(p)
      }
    }
  }

  known_unimplemented (type: number, msg: string): void {
    if ((!this.warnings[type]) || DEBUG > 1) {
      let str = ''
      if (DEBUG <= 1) { str = ' [ further notices suppressed ]' }
      this.log_warn('Unimplemented function ' + type + '(' + msg + ')' + str)
      this.warnings[type] = true
    }
  }

  report_error (e: Error): void {
    this.log_err(e.toString())
    if (this.onerror != undefined) { this.onerror(e) } else { throw (e) }
  }

  report_success (m: string): void {
    if (this.onsuccess != undefined) { this.onsuccess(m) }
  }

  on<K extends SpiceEventType> (event: K, handler: SpiceEventHandlers[K]): void {
    if (!this.event_handlers.has(event)) {
      this.event_handlers.set(event, new Set())
    }
    this.event_handlers.get(event)!.add(handler)
  }

  off<K extends SpiceEventType> (event: K, handler: SpiceEventHandlers[K]): void {
    const handlers = this.event_handlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  emit<K extends SpiceEventType> (event: K, ...args: Parameters<SpiceEventHandlers[K]>): void {
    const handlers = this.event_handlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as Function)(...args)
        } catch (e) {
          this.log_err('Error in event handler for ' + event + ': ' + e)
        }
      })
    }
  }

  cleanup (): void {
    if (this.timeout) {
      window.clearTimeout(this.timeout)
      delete this.timeout
    }
    if (this.ws) {
      this.ws.close()
      this.ws = undefined as any
    }
  }

  handle_timeout (): void {
    const e = new Error('Connection timed out.')
    this.report_error(e)
  }
}

function spiceconn_timeout (sc: SpiceConn): void {
  sc.handle_timeout()
}
