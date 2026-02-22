/*
   Copyright (C) 2014 by Jeremy P. White <jwhite@codeweavers.com>

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
**  SpicePlaybackConn
**      Drive the Spice Playback channel (sound out)
**-------------------------------------------------------------------------- */

import * as Utils from './utils'
import * as Webm from './webm'
import * as Messages from './spicemsg'
import { Constants } from './enums'
import { SpiceConn } from './spiceconn'

export class SpicePlaybackConn extends SpiceConn {
  queue: ArrayBuffer[] = []
  append_okay: boolean = false
  start_time: number = 0
  media_source: MediaSource | undefined
  audio: HTMLAudioElement | undefined
  source_buffer: SourceBuffer | undefined
  bytes_written: number = 0
  cluster_time: number = 0
  last_data_time: number = 0

  constructor (o: any) {
    super(o)
  }

  process_channel_message (msg: any): boolean {
    if (!window.MediaSource) {
      this.log_err('MediaSource API is not available')
      return false
    }

    if (msg.type == Constants.SPICE_MSG_PLAYBACK_START) {
      const start = new Messages.SpiceMsgPlaybackStart(msg.data)

      Utils.PLAYBACK_DEBUG > 0 && console.log('PlaybackStart; frequency ' + start.frequency)

      if (start.frequency != Webm.Constants.OPUS_FREQUENCY) {
        this.log_err('This player cannot handle frequency ' + start.frequency)
        return false
      }

      if (start.channels != Webm.Constants.OPUS_CHANNELS) {
        this.log_err('This player cannot handle ' + start.channels + ' channels')
        return false
      }

      if (start.format != Constants.SPICE_AUDIO_FMT_S16) {
        this.log_err('This player cannot format ' + start.format)
        return false
      }

      if (!this.source_buffer) {
        this.media_source = new MediaSource()
        this.media_source.spiceconn = this

        this.audio = document.createElement('audio')
        this.audio.spiceconn = this
        this.audio.setAttribute('autoplay', 'true')
        this.audio.src = window.URL.createObjectURL(this.media_source)
        var screenElement = document.getElementById(this.parent.screen_id)
        if (screenElement) {
          screenElement.appendChild(this.audio)
        }

        this.media_source.addEventListener('sourceopen', handle_source_open, false)
        this.media_source.addEventListener('sourceended', handle_source_ended, false)
        this.media_source.addEventListener('sourceclosed', handle_source_closed, false)

        this.bytes_written = 0

        return true
      }
    }

    if (msg.type == Constants.SPICE_MSG_PLAYBACK_DATA) {
      const data = new Messages.SpiceMsgPlaybackData(msg.data)

      if (!this.source_buffer) {
        return true
      }

      if (this.audio && this.audio.readyState >= 3 && this.audio.buffered.length > 1 &&
                this.audio.currentTime == this.audio.buffered.end(0) &&
                this.audio.currentTime < this.audio.buffered.start(this.audio.buffered.length - 1)) {
        console.log('Audio underrun: we appear to have fallen behind; advancing to ' +
                    this.audio.buffered.start(this.audio.buffered.length - 1))
        this.audio.currentTime = this.audio.buffered.start(this.audio.buffered.length - 1)
      }

      /* Around version 45, Firefox started being very particular about the
               time stamps put into the Opus stream.  The time stamps from the Spice server are
               somewhat irregular.  They mostly arrive every 10 ms, but sometimes it is 11, or sometimes
               with two time stamps the same in a row.  The previous logic resulted in fuzzy and/or
               distorted audio streams in Firefox in a row.

               In theory, the sequence mode should be appropriate for us, but as of 09/27/2016,
               I was unable to make sequence mode work with Firefox.

               Thus, we end up with an inelegant hack.  Essentially, we force every packet to have
               a 10ms time delta, unless there is an obvious gap in time stream, in which case we
               will resync.
            */

      if (this.start_time != 0 && data.time != (this.last_data_time + Webm.Constants.EXPECTED_PACKET_DURATION)) {
        if (Math.abs(data.time - (Webm.Constants.EXPECTED_PACKET_DURATION + this.last_data_time)) < Webm.Constants.MAX_CLUSTER_TIME) {
          Utils.PLAYBACK_DEBUG > 1 && console.log('Hacking time of ' + data.time + ' to ' +
                                        (this.last_data_time + Webm.Constants.EXPECTED_PACKET_DURATION))
          data.time = this.last_data_time + Webm.Constants.EXPECTED_PACKET_DURATION
        } else {
          Utils.PLAYBACK_DEBUG > 1 && console.log('Apparent gap in audio time; now is ' + data.time + ' last was ' + this.last_data_time)
        }
      }

      this.last_data_time = data.time

      Utils.PLAYBACK_DEBUG > 1 && console.log('PlaybackData; time ' + data.time + '; length ' + data.data.byteLength)

      if (this.start_time == 0) {
        this.start_playback(data)
      } else if (data.time - this.cluster_time >= Webm.Constants.MAX_CLUSTER_TIME) {
        this.new_cluster(data)
      } else {
        this.simple_block(data, false)
      }

      return true
    }

    if (msg.type == Constants.SPICE_MSG_PLAYBACK_MODE) {
      const mode = new Messages.SpiceMsgPlaybackMode(msg.data)
      if (mode.mode != Constants.SPICE_AUDIO_DATA_MODE_OPUS) {
        this.log_err('This player cannot handle mode ' + mode.mode)
        delete this.source_buffer
      }
      return true
    }

    if (msg.type == Constants.SPICE_MSG_PLAYBACK_STOP) {
      Utils.PLAYBACK_DEBUG > 0 && console.log('PlaybackStop')
      if (this.source_buffer) {
        var screenElement = document.getElementById(this.parent.screen_id)
        if (screenElement && this.audio) {
          screenElement.removeChild(this.audio)
          window.URL.revokeObjectURL(this.audio.src)
        }

        delete this.source_buffer
        delete this.media_source
        delete this.audio

        this.append_okay = false
        this.queue = []
        this.start_time = 0

        return true
      }
    }

    if (msg.type == Constants.SPICE_MSG_PLAYBACK_VOLUME) {
      this.known_unimplemented(msg.type, 'Playback Volume')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_PLAYBACK_MUTE) {
      this.known_unimplemented(msg.type, 'Playback Mute')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_PLAYBACK_LATENCY) {
      this.known_unimplemented(msg.type, 'Playback Latency')
      return true
    }

    return false
  }

  start_playback (data: any) {
    this.start_time = data.time

    const h = new Webm.Header()
    const te = new Webm.AudioTrackEntry()
    const t = new Webm.Tracks(te)

    const mb = new ArrayBuffer(h.buffer_size() + t.buffer_size())

    this.bytes_written = h.to_buffer(mb)
    this.bytes_written = t.to_buffer(mb, this.bytes_written)

    if (this.source_buffer) {
      this.source_buffer.addEventListener('error', handle_sourcebuffer_error, false)
      this.source_buffer.addEventListener('updateend', handle_append_buffer_done, false)
      playback_append_buffer(this, mb)
    }

    this.new_cluster(data)
  }

  new_cluster (data: any) {
    this.cluster_time = data.time

    const c = new Webm.Cluster(data.time - this.start_time)

    const mb = new ArrayBuffer(c.buffer_size())
    this.bytes_written += c.to_buffer(mb)

    if (this.append_okay) {
      playback_append_buffer(this, mb)
    } else {
      this.queue.push(mb)
    }

    this.simple_block(data, true)
  }

  simple_block (data: any, keyframe: boolean) {
    const sb = new Webm.SimpleBlock(data.time - this.cluster_time, data.data, keyframe)
    const mb = new ArrayBuffer(sb.buffer_size())

    this.bytes_written += sb.to_buffer(mb)

    if (this.append_okay) {
      playback_append_buffer(this, mb)
    } else {
      this.queue.push(mb)
    }
  }
}

function handle_source_open (this: MediaSource & { spiceconn: SpicePlaybackConn }, e: Event) {
  const p = this.spiceconn

  if (p.source_buffer) {
    return
  }

  try {
    p.source_buffer = this.addSourceBuffer(Webm.Constants.SPICE_PLAYBACK_CODEC)
  } catch (error) {
    p.log_err('Codec ' + Webm.Constants.SPICE_PLAYBACK_CODEC + ' not available.')
    return
  }

  if (Utils.PLAYBACK_DEBUG > 0) {
    playback_handle_event_debug.call(this, e)
  }

  listen_for_audio_events(p)

  if (p.source_buffer) {
    p.source_buffer.spiceconn = p
    p.source_buffer.mode = 'segments'
  }

  // FIXME - Experimentation with segments and sequences was unsatisfying.
  //         Switching to sequence did not solve our gap problem,
  //         but the browsers didn't fully support the time seek capability
  //         we would expect to gain from 'segments'.
  //         Segments worked at the time of this patch, so segments it is for now.
}

function handle_source_ended (this: MediaSource & { spiceconn: SpicePlaybackConn }, e: Event) {
  const p = this.spiceconn
  p.log_err('Audio source unexpectedly ended.')
}

function handle_source_closed (this: MediaSource & { spiceconn: SpicePlaybackConn }, e: Event) {
  const p = this.spiceconn
  p.log_err('Audio source unexpectedly closed.')
}

function condense_playback_queue (queue: ArrayBuffer[]): ArrayBuffer {
  if (queue.length == 1) {
    return queue.shift()!
  }

  let len = 0
  let i = 0
  for (i = 0; i < queue.length; i++) {
    len += queue[i].byteLength
  }

  const mb = new ArrayBuffer(len)
  const tmp = new Uint8Array(mb)
  len = 0
  for (i = 0; i < queue.length; i++) {
    tmp.set(new Uint8Array(queue[i]), len)
    len += queue[i].byteLength
  }
  queue.length = 0
  return mb
}

function handle_append_buffer_done (this: SourceBuffer & { spiceconn: SpicePlaybackConn }, e: Event) {
  const p = this.spiceconn

  if (Utils.PLAYBACK_DEBUG > 1) {
    playback_handle_event_debug.call(this, e)
  }

  if (p.queue.length > 0) {
    const mb = condense_playback_queue(p.queue)
    playback_append_buffer(p, mb)
  } else {
    p.append_okay = true
  }
}

function handle_sourcebuffer_error (this: SourceBuffer & { spiceconn: SpicePlaybackConn }, e: Event) {
  const p = this.spiceconn
  p.log_err('source_buffer error')
}

function playback_append_buffer (p: SpicePlaybackConn, b: ArrayBuffer) {
  try {
    if (p.source_buffer) {
      p.source_buffer.appendBuffer(b)
      p.append_okay = false
    }
  } catch (e) {
    p.log_err('Error invoking appendBuffer: ' + (e as Error).message)
  }
}

function playback_handle_event_debug (this: any, e: Event) {
  const p = this.spiceconn
  if (p.audio) {
    if (Utils.PLAYBACK_DEBUG > 0 || p.audio.buffered.length > 1) {
      console.log(p.audio.currentTime + ': event ' + e.type +
                (Utils.dump_media_element ? Utils.dump_media_element(p.audio) : ''))
    }
  }

  if (Utils.PLAYBACK_DEBUG > 1 && p.media_source) {
    console.log('  media_source ' + (Utils.dump_media_source ? Utils.dump_media_source(p.media_source) : ''))
  }

  if (Utils.PLAYBACK_DEBUG > 1 && p.source_buffer) {
    console.log('  source_buffer ' + (Utils.dump_source_buffer ? Utils.dump_source_buffer(p.source_buffer) : ''))
  }

  if (Utils.PLAYBACK_DEBUG > 0 || p.queue.length > 1) {
    console.log('  queue len ' + p.queue.length + '; append_okay: ' + p.append_okay)
  }
}

function playback_debug_listen_for_one_event (this: any, name: string) {
  this.addEventListener(name, playback_handle_event_debug)
}

function listen_for_audio_events (spiceconn: SpicePlaybackConn) {
  const audio_0_events = [
    'abort', 'error'
  ]

  const audio_1_events = [
    'loadstart', 'suspend', 'emptied', 'stalled', 'loadedmetadata', 'loadeddata', 'canplay',
    'canplaythrough', 'playing', 'waiting', 'seeking', 'seeked', 'ended', 'durationchange',
    'timeupdate', 'play', 'pause', 'ratechange'
  ]

  const audio_2_events = [
    'progress',
    'resize',
    'volumechange'
  ]

  if (spiceconn.audio) {
    audio_0_events.forEach(playback_debug_listen_for_one_event, spiceconn.audio)
    if (Utils.PLAYBACK_DEBUG > 0) {
      audio_1_events.forEach(playback_debug_listen_for_one_event, spiceconn.audio)
    }
    if (Utils.PLAYBACK_DEBUG > 1) {
      audio_2_events.forEach(playback_debug_listen_for_one_event, spiceconn.audio)
    }
  }
}
