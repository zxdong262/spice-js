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

import * as Webm from './webm'
import * as Messages from './spicemsg'
import * as Quic from './quic'
import * as Utils from './utils'
import * as Inputs from './inputs'
import { Constants } from './enums'
import { SpiceConn } from './spiceconn'
import { SpiceRect } from './spicetype'
import { convert_spice_lz_to_web } from './lz'
import { convert_spice_bitmap_to_web } from './bitmap'

/* ----------------------------------------------------------------------------
**  FIXME: putImageData  does not support Alpha blending
**           or compositing.  So if we have data in an ImageData
**           format, we have to draw it onto a context,
**           and then use drawImage to put it onto the target,
**           as drawImage does alpha.
**-------------------------------------------------------------------------- */
export function putImageDataWithAlpha (context: CanvasRenderingContext2D, d: ImageData, x: number, y: number): void {
  const c = document.createElement('canvas')
  const t = c.getContext('2d')
  if (!t) return
  c.setAttribute('width', d.width.toString())
  c.setAttribute('height', d.height.toString())
  t.putImageData(d, 0, 0)
  context.drawImage(c, x, y, d.width, d.height)
}

/* ----------------------------------------------------------------------------
**  FIXME: Spice will send an image with '0' alpha when it is intended to
**           go on a surface w/no alpha.  So in that case, we have to strip
**           out the alpha.  The test case for this was flux box; in a Xspice
**           server, right click on the desktop to get the menu; the top bar
**           doesn't paint/highlight correctly w/out this change.
**-------------------------------------------------------------------------- */
export function stripAlpha (d: ImageData): void {
  for (let i = 0; i < (d.width * d.height * 4); i += 4) {
    d.data[i + 3] = 255
  }
}

interface DrawCopyHelperOptions {
  base: any
  src_area: any
  image_data: ImageData
  tag: string
  has_alpha: boolean
  descriptor: any
}

/* ----------------------------------------------------------------------------
**  SpiceDisplayConn
**      Drive the Spice Display Channel
**-------------------------------------------------------------------------- */
export class SpiceDisplayConn extends SpiceConn {
  surfaces: any[]
  primary_surface: number
  cache: any
  focusListener: () => void
  streams: any = {}

  process_channel_message (msg: any): boolean {
    if (msg.type == Constants.SPICE_MSG_DISPLAY_MODE) {
      this.known_unimplemented(msg.type, 'Display Mode')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_MARK) {
      // FIXME - DISPLAY_MARK not implemented (may be hard or impossible)
      this.known_unimplemented(msg.type, 'Display Mark')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_RESET) {
      Utils.DEBUG > 2 && console.log('Display reset')
      this.surfaces[this.primary_surface].canvas.context.restore()
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_DRAW_COPY) {
      const draw_copy = new Messages.SpiceMsgDisplayDrawCopy(msg.data)

      Utils.DEBUG > 1 && this.log_draw('DrawCopy', draw_copy)

      if (!draw_copy.base.box.is_same_size(draw_copy.data.src_area)) {
        this.log_warn('FIXME: DrawCopy src_area is a different size than base.box; we do not handle that yet.')
      }
      if (draw_copy.base.clip.type != Constants.SPICE_CLIP_TYPE_NONE) {
        this.log_warn("FIXME: DrawCopy we don't handle clipping yet")
      }
      if (draw_copy.data.rop_descriptor != Constants.SPICE_ROPD_OP_PUT) {
        this.log_warn("FIXME: DrawCopy we don't handle ropd type: " + draw_copy.data.rop_descriptor)
      }
      if (draw_copy.data.mask.flags) {
        this.log_warn("FIXME: DrawCopy we don't handle mask flag: " + draw_copy.data.mask.flags)
      }
      if (draw_copy.data.mask.bitmap) {
        this.log_warn("FIXME: DrawCopy we don't handle mask")
      }

      if (draw_copy.data && draw_copy.data.src_bitmap) {
        if (draw_copy.data.src_bitmap.descriptor.flags &&
          draw_copy.data.src_bitmap.descriptor.flags != Constants.SPICE_IMAGE_FLAGS_CACHE_ME &&
          draw_copy.data.src_bitmap.descriptor.flags != Constants.SPICE_IMAGE_FLAGS_HIGH_BITS_SET) {
          this.log_warn('FIXME: DrawCopy unhandled image flags: ' + draw_copy.data.src_bitmap.descriptor.flags)
          Utils.DEBUG <= 1 && this.log_draw('DrawCopy', draw_copy)
        }

        if (draw_copy.data.src_bitmap.descriptor.type == Constants.SPICE_IMAGE_TYPE_QUIC) {
          const canvas = this.surfaces[draw_copy.base.surface_id].canvas
          if (!draw_copy.data.src_bitmap.quic) {
            this.log_warn('FIXME: DrawCopy could not handle this QUIC file.')
            return false
          }
          const source_img = Quic.convert_spice_quic_to_web(canvas.context,
            draw_copy.data.src_bitmap.quic)

          return this.draw_copy_helper({
            base: draw_copy.base,
            src_area: draw_copy.data.src_area,
            image_data: source_img,
            tag: 'copyquic.' + draw_copy.data.src_bitmap.quic.type,
            has_alpha: (draw_copy.data.src_bitmap.quic.type == Quic.Constants.QUIC_IMAGE_TYPE_RGBA),
            descriptor: draw_copy.data.src_bitmap.descriptor
          })
        } else if (draw_copy.data.src_bitmap.descriptor.type == Constants.SPICE_IMAGE_TYPE_FROM_CACHE ||
          draw_copy.data.src_bitmap.descriptor.type == Constants.SPICE_IMAGE_TYPE_FROM_CACHE_LOSSLESS) {
          if (!this.cache || !this.cache[draw_copy.data.src_bitmap.descriptor.id]) {
            this.log_warn('FIXME: DrawCopy did not find image id ' + draw_copy.data.src_bitmap.descriptor.id + ' in cache.')
            return false
          }

          return this.draw_copy_helper({
            base: draw_copy.base,
            src_area: draw_copy.data.src_area,
            image_data: this.cache[draw_copy.data.src_bitmap.descriptor.id],
            tag: 'copycache.' + draw_copy.data.src_bitmap.descriptor.id,
            has_alpha: true, /* FIXME - may want this to be false... */
            descriptor: draw_copy.data.src_bitmap.descriptor
          })

          /* FIXME - LOSSLESS CACHE ramifications not understood or handled */
        } else if (draw_copy.data.src_bitmap.descriptor.type == Constants.SPICE_IMAGE_TYPE_SURFACE) {
          const source_context = this.surfaces[draw_copy.data.src_bitmap.surface_id].canvas.context

          const source_img = source_context.getImageData(
            draw_copy.data.src_area.left, draw_copy.data.src_area.top,
            draw_copy.data.src_area.right - draw_copy.data.src_area.left,
            draw_copy.data.src_area.bottom - draw_copy.data.src_area.top)
          const computed_src_area = new SpiceRect()
          computed_src_area.top = computed_src_area.left = 0
          computed_src_area.right = source_img.width
          computed_src_area.bottom = source_img.height

          /* FIXME - there is a potential optimization here.
                     That is, if the surface is from 0,0, and
                     both surfaces are alpha surfaces, you should
                     be able to just do a drawImage, which should
                     save time.  */

          return this.draw_copy_helper({
            base: draw_copy.base,
            src_area: computed_src_area,
            image_data: source_img,
            tag: 'copysurf.' + draw_copy.data.src_bitmap.surface_id,
            has_alpha: this.surfaces[draw_copy.data.src_bitmap.surface_id].format != Constants.SPICE_SURFACE_FMT_32_xRGB,
            descriptor: draw_copy.data.src_bitmap.descriptor
          })
        } else if (draw_copy.data.src_bitmap.descriptor.type == Constants.SPICE_IMAGE_TYPE_JPEG) {
          if (!draw_copy.data.src_bitmap.jpeg) {
            this.log_warn('FIXME: DrawCopy could not handle this JPEG file.')
            return false
          }

          // FIXME - how lame is this.  Be have it in binary format, and we have
          //         to put it into string to get it back into jpeg.  Blech.
          let tmpstr = 'data:image/jpeg,'
          const img = new Image()
          const qdv = new Uint8Array(draw_copy.data.src_bitmap.jpeg.data)
          for (let i = 0; i < qdv.length; i++) {
            tmpstr += '%'
            if (qdv[i] < 16) {
              tmpstr += '0'
            }
            tmpstr += qdv[i].toString(16)
          }

          img.o = {
            base: draw_copy.base,
            tag: 'jpeg.' + draw_copy.data.src_bitmap.surface_id,
            descriptor: draw_copy.data.src_bitmap.descriptor,
            sc: this
          }
          img.onload = handle_draw_jpeg_onload
          img.src = tmpstr

          return true
        } else if (draw_copy.data.src_bitmap.descriptor.type == Constants.SPICE_IMAGE_TYPE_JPEG_ALPHA) {
          if (!draw_copy.data.src_bitmap.jpeg_alpha) {
            this.log_warn('FIXME: DrawCopy could not handle this JPEG ALPHA file.')
            return false
          }

          // FIXME - how lame is this.  Be have it in binary format, and we have
          //         to put it into string to get it back into jpeg.  Blech.
          let tmpstr = 'data:image/jpeg,'
          const img = new Image()
          const qdv = new Uint8Array(draw_copy.data.src_bitmap.jpeg_alpha.data)
          for (let i = 0; i < qdv.length; i++) {
            tmpstr += '%'
            if (qdv[i] < 16) {
              tmpstr += '0'
            }
            tmpstr += qdv[i].toString(16)
          }

          img.o = {
            base: draw_copy.base,
            tag: 'jpeg.' + draw_copy.data.src_bitmap.surface_id,
            descriptor: draw_copy.data.src_bitmap.descriptor,
            sc: this
          }

          if (this.surfaces[draw_copy.base.surface_id].format == Constants.SPICE_SURFACE_FMT_32_ARGB) {
            const canvas = this.surfaces[draw_copy.base.surface_id].canvas
            img.alpha_img = convert_spice_lz_to_web(canvas.context,
              draw_copy.data.src_bitmap.jpeg_alpha.alpha)
          }
          img.onload = handle_draw_jpeg_onload
          img.src = tmpstr

          return true
        } else if (draw_copy.data.src_bitmap.descriptor.type == Constants.SPICE_IMAGE_TYPE_BITMAP) {
          const canvas = this.surfaces[draw_copy.base.surface_id].canvas
          if (!draw_copy.data.src_bitmap.bitmap) {
            this.log_err('null bitmap')
            return false
          }

          const source_img = convert_spice_bitmap_to_web(canvas.context,
            draw_copy.data.src_bitmap.bitmap)
          if (!source_img) {
            this.log_warn('FIXME: Unable to interpret bitmap of format: ' +
              draw_copy.data.src_bitmap.bitmap.format)
            return false
          }

          return this.draw_copy_helper({
            base: draw_copy.base,
            src_area: draw_copy.data.src_area,
            image_data: source_img,
            tag: 'bitmap.' + draw_copy.data.src_bitmap.bitmap.format,
            has_alpha: (draw_copy.data.src_bitmap.bitmap as any).format != Constants.SPICE_BITMAP_FMT_32BIT,
            descriptor: draw_copy.data.src_bitmap.descriptor
          })
        } else if (draw_copy.data.src_bitmap.descriptor.type == Constants.SPICE_IMAGE_TYPE_LZ_RGB) {
          const canvas = this.surfaces[draw_copy.base.surface_id].canvas
          if (!draw_copy.data.src_bitmap.lz_rgb) {
            this.log_err('null lz_rgb ')
            return false
          }

          const source_img = convert_spice_lz_to_web(canvas.context,
            draw_copy.data.src_bitmap.lz_rgb)
          if (!source_img) {
            this.log_warn('FIXME: Unable to interpret bitmap of type: ' +
              draw_copy.data.src_bitmap.lz_rgb.type)
            return false
          }

          return this.draw_copy_helper({
            base: draw_copy.base,
            src_area: draw_copy.data.src_area,
            image_data: source_img,
            tag: 'lz_rgb.' + draw_copy.data.src_bitmap.lz_rgb.type,
            has_alpha: draw_copy.data.src_bitmap.lz_rgb.type == Constants.LZ_IMAGE_TYPE_RGBA,
            descriptor: draw_copy.data.src_bitmap.descriptor
          })
        } else {
          this.log_warn('FIXME: DrawCopy unhandled image type: ' + draw_copy.data.src_bitmap.descriptor.type)
          this.log_draw('DrawCopy', draw_copy)
          return false
        }
      }

      this.log_warn('FIXME: DrawCopy no src_bitmap.')
      return false
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_DRAW_FILL) {
      const draw_fill = new Messages.SpiceMsgDisplayDrawFill(msg.data)

      Utils.DEBUG > 1 && this.log_draw('DrawFill', draw_fill)

      if (draw_fill.data.rop_descriptor != Constants.SPICE_ROPD_OP_PUT) {
        this.log_warn("FIXME: DrawFill we don't handle ropd type: " + draw_fill.data.rop_descriptor)
      }
      if (draw_fill.data.mask.flags) {
        this.log_warn("FIXME: DrawFill we don't handle mask flag: " + draw_fill.data.mask.flags)
      }
      if (draw_fill.data.mask.bitmap) {
        this.log_warn("FIXME: DrawFill we don't handle mask")
      }

      if (draw_fill.data.brush.type == Constants.SPICE_BRUSH_TYPE_SOLID) {
        // FIXME - do brushes ever have alpha?
        const color = draw_fill.data.brush.color & 0xffffff
        const color_str = 'rgb(' + (color >> 16) + ', ' + ((color >> 8) & 0xff) + ', ' + (color & 0xff) + ')'
        this.surfaces[draw_fill.base.surface_id].canvas.context.fillStyle = color_str

        this.surfaces[draw_fill.base.surface_id].canvas.context.fillRect(
          draw_fill.base.box.left, draw_fill.base.box.top,
          draw_fill.base.box.right - draw_fill.base.box.left,
          draw_fill.base.box.bottom - draw_fill.base.box.top)

        if (Utils.DUMP_DRAWS && this.parent.dump_id) {
          const debug_canvas = document.createElement('canvas')
          debug_canvas.setAttribute('width', this.surfaces[draw_fill.base.surface_id].canvas.width.toString())
          debug_canvas.setAttribute('height', this.surfaces[draw_fill.base.surface_id].canvas.height.toString())
          debug_canvas.setAttribute('id', 'fillbrush.' + draw_fill.base.surface_id + '.' + this.surfaces[draw_fill.base.surface_id].draw_count)
          debug_canvas.getContext('2d').fillStyle = color_str
          debug_canvas.getContext('2d').fillRect(
            draw_fill.base.box.left, draw_fill.base.box.top,
            draw_fill.base.box.right - draw_fill.base.box.left,
            draw_fill.base.box.bottom - draw_fill.base.box.top)
          document.getElementById(this.parent.dump_id).appendChild(debug_canvas)
        }

        this.surfaces[draw_fill.base.surface_id].draw_count++
      } else {
        this.log_warn("FIXME: DrawFill can't handle brush type: " + draw_fill.data.brush.type)
      }
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_DRAW_OPAQUE) {
      this.known_unimplemented(msg.type, 'Display Draw Opaque')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_DRAW_BLEND) {
      this.known_unimplemented(msg.type, 'Display Draw Blend')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_DRAW_BLACKNESS) {
      this.known_unimplemented(msg.type, 'Display Draw Blackness')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_DRAW_WHITENESS) {
      this.known_unimplemented(msg.type, 'Display Draw Whiteness')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_DRAW_INVERS) {
      this.known_unimplemented(msg.type, 'Display Draw Invers')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_DRAW_ROP3) {
      this.known_unimplemented(msg.type, 'Display Draw ROP3')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_DRAW_STROKE) {
      this.known_unimplemented(msg.type, 'Display Draw Stroke')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_DRAW_TRANSPARENT) {
      this.known_unimplemented(msg.type, 'Display Draw Transparent')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_DRAW_ALPHA_BLEND) {
      this.known_unimplemented(msg.type, 'Display Draw Alpha Blend')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_COPY_BITS) {
      const copy_bits = new Messages.SpiceMsgDisplayCopyBits(msg.data)

      Utils.DEBUG > 1 && this.log_draw('CopyBits', copy_bits)

      const source_canvas = this.surfaces[copy_bits.base.surface_id].canvas
      const source_context = source_canvas.context

      let width = source_canvas.width - copy_bits.src_pos.x
      let height = source_canvas.height - copy_bits.src_pos.y
      if (width > (copy_bits.base.box.right - copy_bits.base.box.left)) {
        width = copy_bits.base.box.right - copy_bits.base.box.left
      }
      if (height > (copy_bits.base.box.bottom - copy_bits.base.box.top)) {
        height = copy_bits.base.box.bottom - copy_bits.base.box.top
      }

      const source_img = source_context.getImageData(
        copy_bits.src_pos.x, copy_bits.src_pos.y, width, height)
      putImageDataWithAlpha(source_context, source_img, copy_bits.base.box.left, copy_bits.base.box.top)

      if (Utils.DUMP_DRAWS && this.parent.dump_id) {
        const debug_canvas = document.createElement('canvas')
        debug_canvas.setAttribute('width', width.toString())
        debug_canvas.setAttribute('height', height.toString())
        debug_canvas.setAttribute('id', 'copybits' + copy_bits.base.surface_id + '.' + this.surfaces[copy_bits.base.surface_id].draw_count)
        debug_canvas.getContext('2d').putImageData(source_img, 0, 0)
        document.getElementById(this.parent.dump_id).appendChild(debug_canvas)
      }

      this.surfaces[copy_bits.base.surface_id].draw_count++
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_INVAL_ALL_PIXMAPS) {
      this.known_unimplemented(msg.type, 'Display Inval All Pixmaps')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_INVAL_PALETTE) {
      this.known_unimplemented(msg.type, 'Display Inval Palette')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_INVAL_ALL_PALETTES) {
      this.known_unimplemented(msg.type, 'Inval All Palettes')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_SURFACE_CREATE) {
      if (!this.surfaces) {
        this.surfaces = []
      }

      const m = new Messages.SpiceMsgSurfaceCreate(msg.data)
      Utils.DEBUG > 1 && console.log(this.type + ': MsgSurfaceCreate id ' + m.surface.surface_id +
        '; ' + m.surface.width + 'x' + m.surface.height +
        '; format ' + m.surface.format +
        '; flags ' + m.surface.flags)
      if (m.surface.format != Constants.SPICE_SURFACE_FMT_32_xRGB &&
        m.surface.format != Constants.SPICE_SURFACE_FMT_32_ARGB) {
        this.log_warn('FIXME: cannot handle surface format ' + m.surface.format + ' yet.')
        return false
      }

      const canvas = document.createElement('canvas')
      canvas.setAttribute('width', m.surface.width.toString())
      canvas.setAttribute('height', m.surface.height.toString())
      canvas.setAttribute('id', 'spice_surface_' + m.surface.surface_id)
      canvas.setAttribute('tabindex', m.surface.surface_id.toString())
      canvas.context = canvas.getContext('2d')

      if (Utils.DUMP_CANVASES && this.parent.dump_id) {
        document.getElementById(this.parent.dump_id).appendChild(canvas)
      }

      const surface: any = m.surface
      surface.canvas = canvas
      surface.draw_count = 0
      this.surfaces[m.surface.surface_id] = surface

      if (this.parent && this.parent.scale_view) {
        canvas.style.maxWidth = '100%'
        canvas.style.maxHeight = '100%'
        canvas.style.objectFit = 'contain'
      }

      if (m.surface.flags & Constants.SPICE_SURFACE_FLAGS_PRIMARY) {
        this.primary_surface = m.surface.surface_id

        /* This .save() is done entirely to enable SPICE_MSG_DISPLAY_RESET */
        canvas.context.save()
        document.getElementById(this.parent.screen_id).appendChild(canvas)

        /* We're going to leave width dynamic, but correctly set the height */
        document.getElementById(this.parent.screen_id).style.height = m.surface.height + 'px'
        this.hook_events()
      }
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_SURFACE_DESTROY) {
      const m = new Messages.SpiceMsgSurfaceDestroy(msg.data)
      Utils.DEBUG > 1 && console.log(this.type + ': MsgSurfaceDestroy id ' + m.surface_id)
      this.delete_surface(m.surface_id)
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_STREAM_CREATE) {
      const m = new Messages.SpiceMsgDisplayStreamCreate(msg.data)
      Utils.STREAM_DEBUG > 0 && console.log(this.type + ': MsgStreamCreate id' + m.id + '; type ' + m.codec_type +
        '; width ' + m.stream_width + '; height ' + m.stream_height +
        '; left ' + m.dest.left + '; top ' + m.dest.top
      )
      if (!this.streams) {
        this.streams = []
      }
      if (this.streams[m.id]) {
        console.log('Stream ' + m.id + ' already exists')
      } else {
        this.streams[m.id] = m
      }

      if (m.codec_type == Constants.SPICE_VIDEO_CODEC_TYPE_VP8) {
        const media = new MediaSource()
        const v = document.createElement('video')
        v.src = window.URL.createObjectURL(media)

        v.setAttribute('muted', 'true')
        v.setAttribute('autoplay', 'true')
        v.setAttribute('width', m.stream_width.toString())
        v.setAttribute('height', m.stream_height.toString())

        let left = m.dest.left
        let top = m.dest.top
        if (this.surfaces[m.surface_id] !== undefined) {
          left += this.surfaces[m.surface_id].canvas.offsetLeft
          top += this.surfaces[m.surface_id].canvas.offsetTop
        }
        document.getElementById(this.parent.screen_id).appendChild(v)
        v.setAttribute('style', 'pointer-events:none; position: absolute; top:' + top + 'px; left:' + left + 'px;')

        media.addEventListener('sourceopen', handle_video_source_open, false)
        media.addEventListener('sourceended', handle_video_source_ended, false)
        media.addEventListener('sourceclosed', handle_video_source_closed, false)

        const s = this.streams[m.id]
        s.video = v
        s.media = media
        s.queue = []
        s.start_time = 0
        s.cluster_time = 0
        s.append_okay = false

        media.stream = s
        media.spiceconn = this
        v.spice_stream = s
      } else if (m.codec_type == Constants.SPICE_VIDEO_CODEC_TYPE_MJPEG) {
        this.streams[m.id].frames_loading = 0
      } else {
        console.log('Unhandled stream codec: ' + m.codec_type)
      }
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_STREAM_DATA ||
      msg.type == Constants.SPICE_MSG_DISPLAY_STREAM_DATA_SIZED) {
      let m
      if (msg.type == Constants.SPICE_MSG_DISPLAY_STREAM_DATA_SIZED) {
        m = new Messages.SpiceMsgDisplayStreamDataSized(msg.data)
      } else {
        m = new Messages.SpiceMsgDisplayStreamData(msg.data)
      }

      if (!this.streams[m.base.id]) {
        console.log('no stream for data')
        return false
      }

      const time_until_due = m.base.multi_media_time - this.parent.relative_now()

      if (this.streams[m.base.id].codec_type === Constants.SPICE_VIDEO_CODEC_TYPE_MJPEG) {
        process_mjpeg_stream_data(this, m, time_until_due)
      }

      if (this.streams[m.base.id].codec_type === Constants.SPICE_VIDEO_CODEC_TYPE_VP8) {
        process_video_stream_data(this.streams[m.base.id], m)
      }

      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_STREAM_ACTIVATE_REPORT) {
      const m = new Messages.SpiceMsgDisplayStreamActivateReport(msg.data)

      const report = new Messages.SpiceMsgcDisplayStreamReport(m.stream_id, m.unique_id)
      if (this.streams[m.stream_id]) {
        this.streams[m.stream_id].report = report
        this.streams[m.stream_id].max_window_size = m.max_window_size
        this.streams[m.stream_id].timeout_ms = m.timeout_ms
      }

      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_STREAM_CLIP) {
      const m = new Messages.SpiceMsgDisplayStreamClip(msg.data)
      Utils.STREAM_DEBUG > 1 && console.log(this.type + ': MsgStreamClip id' + m.id)
      this.streams[m.id].clip = m.clip
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_STREAM_DESTROY) {
      const m = new Messages.SpiceMsgDisplayStreamDestroy(msg.data)
      Utils.STREAM_DEBUG > 0 && console.log(this.type + ': MsgStreamDestroy id' + m.id)

      if (this.streams[m.id].codec_type == Constants.SPICE_VIDEO_CODEC_TYPE_VP8) {
        document.getElementById(this.parent.screen_id).removeChild(this.streams[m.id].video)
        this.streams[m.id].source_buffer = null
        this.streams[m.id].media = null
        this.streams[m.id].video = null
      }
      this.streams[m.id] = undefined
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_STREAM_DESTROY_ALL) {
      this.known_unimplemented(msg.type, 'Display Stream Destroy All')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_INVAL_LIST) {
      const m = new Messages.SpiceMsgDisplayInvalList(msg.data)
      Utils.DEBUG > 1 && console.log(this.type + ': MsgInvalList ' + m.count + ' items')
      for (let i = 0; i < m.count; i++) {
        if (this.cache[m.resources[i].id] != undefined) {
          delete this.cache[m.resources[i].id]
        }
      }
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_MONITORS_CONFIG) {
      this.known_unimplemented(msg.type, 'Display Monitors Config')
      return true
    }

    if (msg.type == Constants.SPICE_MSG_DISPLAY_DRAW_COMPOSITE) {
      this.known_unimplemented(msg.type, 'Display Draw Composite')
      return true
    }

    return false
  }

  delete_surface (surface_id: number): void {
    const canvas = document.getElementById('spice_surface_' + surface_id)
    if (Utils.DUMP_CANVASES && this.parent.dump_id) {
      document.getElementById(this.parent.dump_id).removeChild(canvas)
    }
    if (this.primary_surface == surface_id) {
      this.unhook_events()
      this.primary_surface = undefined
      document.getElementById(this.parent.screen_id).removeChild(canvas)
    }

    delete this.surfaces[surface_id]
  }

  draw_copy_helper (o: DrawCopyHelperOptions): boolean {
    const canvas = this.surfaces[o.base.surface_id].canvas
    if (o.has_alpha) {
      /* FIXME - This is based on trial + error, not a serious thoughtful
                 analysis of what Spice requires.  See display.js for more. */
      if (this.surfaces[o.base.surface_id].format == Constants.SPICE_SURFACE_FMT_32_xRGB) {
        stripAlpha(o.image_data)
        canvas.context.putImageData(o.image_data, o.base.box.left, o.base.box.top)
      } else {
        putImageDataWithAlpha(canvas.context, o.image_data,
          o.base.box.left, o.base.box.top)
      }
    } else {
      canvas.context.putImageData(o.image_data, o.base.box.left, o.base.box.top)
    }

    if (o.src_area.left > 0 || o.src_area.top > 0) {
      this.log_warn('FIXME: DrawCopy not shifting draw copies just yet...')
    }

    if (o.descriptor && (o.descriptor.flags & Constants.SPICE_IMAGE_FLAGS_CACHE_ME)) {
      if (!this.cache) {
        this.cache = {}
      }
      this.cache[o.descriptor.id] = o.image_data
    }

    if (Utils.DUMP_DRAWS && this.parent.dump_id) {
      const debug_canvas = document.createElement('canvas')
      debug_canvas.setAttribute('width', o.image_data.width.toString())
      debug_canvas.setAttribute('height', o.image_data.height.toString())
      debug_canvas.setAttribute('id', o.tag + '.' +
        this.surfaces[o.base.surface_id].draw_count + '.' +
        o.base.surface_id + '@' + o.base.box.left + 'x' + o.base.box.top)
      debug_canvas.getContext('2d').putImageData(o.image_data, 0, 0)
      document.getElementById(this.parent.dump_id).appendChild(debug_canvas)
    }

    this.surfaces[o.base.surface_id].draw_count++

    return true
  }

  log_draw (prefix: string, draw: any): void {
    let str = prefix + '.' + draw.base.surface_id + '.' + this.surfaces[draw.base.surface_id].draw_count + ': '
    str += 'base.box ' + draw.base.box.left + ', ' + draw.base.box.top + ' to ' +
      draw.base.box.right + ', ' + draw.base.box.bottom
    str += '; clip.type ' + draw.base.clip.type

    if (draw.data) {
      if (draw.data.src_area) {
        str += '; src_area ' + draw.data.src_area.left + ', ' + draw.data.src_area.top + ' to ' +
          draw.data.src_area.right + ', ' + draw.data.src_area.bottom
      }

      if (draw.data.src_bitmap && draw.data.src_bitmap != null) {
        str += '; src_bitmap id: ' + draw.data.src_bitmap.descriptor.id
        str += '; src_bitmap width ' + draw.data.src_bitmap.descriptor.width + ', height ' + draw.data.src_bitmap.descriptor.height
        str += '; src_bitmap type ' + draw.data.src_bitmap.descriptor.type + ', flags ' + draw.data.src_bitmap.descriptor.flags
        if (draw.data.src_bitmap.surface_id !== undefined) {
          str += '; src_bitmap surface_id ' + draw.data.src_bitmap.surface_id
        }
        if (draw.data.src_bitmap.bitmap) {
          str += '; BITMAP format ' + draw.data.src_bitmap.bitmap.format +
            '; flags ' + draw.data.src_bitmap.bitmap.flags +
            '; x ' + draw.data.src_bitmap.bitmap.x +
            '; y ' + draw.data.src_bitmap.bitmap.y +
            '; stride ' + draw.data.src_bitmap.bitmap.stride
        }
        if (draw.data.src_bitmap.quic) {
          str += '; QUIC type ' + draw.data.src_bitmap.quic.type +
            '; width ' + draw.data.src_bitmap.quic.width +
            '; height ' + draw.data.src_bitmap.quic.height
        }
        if (draw.data.src_bitmap.lz_rgb) {
          str += '; LZ_RGB length ' + draw.data.src_bitmap.lz_rgb.length +
            '; magic ' + draw.data.src_bitmap.lz_rgb.magic +
            '; version 0x' + draw.data.src_bitmap.lz_rgb.version.toString(16) +
            '; type ' + draw.data.src_bitmap.lz_rgb.type +
            '; width ' + draw.data.src_bitmap.lz_rgb.width +
            '; height ' + draw.data.src_bitmap.lz_rgb.height +
            '; stride ' + draw.data.src_bitmap.lz_rgb.stride +
            '; top down ' + draw.data.src_bitmap.lz_rgb.top_down
        }
      } else {
        str += '; src_bitmap is null'
      }

      if (draw.data.brush) {
        if (draw.data.brush.type == Constants.SPICE_BRUSH_TYPE_SOLID) {
          str += '; brush.color 0x' + draw.data.brush.color.toString(16)
        }
        if (draw.data.brush.type == Constants.SPICE_BRUSH_TYPE_PATTERN) {
          str += '; brush.pat '
          if (draw.data.brush.pattern.pat != null) {
            str += '[SpiceImage]'
          } else {
            str += '[null]'
          }
          str += ' at ' + draw.data.brush.pattern.pos.x + ', ' + draw.data.brush.pattern.pos.y
        }
      }

      str += '; rop_descriptor ' + draw.data.rop_descriptor
      if (draw.data.scale_mode !== undefined) {
        str += '; scale_mode ' + draw.data.scale_mode
      }
      str += '; mask.flags ' + draw.data.mask.flags
      str += '; mask.pos ' + draw.data.mask.pos.x + ', ' + draw.data.mask.pos.y
      if (draw.data.mask.bitmap != null) {
        str += '; mask.bitmap width ' + draw.data.mask.bitmap.descriptor.width + ', height ' + draw.data.mask.bitmap.descriptor.height
        str += '; mask.bitmap type ' + draw.data.mask.bitmap.descriptor.type + ', flags ' + draw.data.mask.bitmap.descriptor.flags
      } else {
        str += '; mask.bitmap is null'
      }
    }

    console.log(str)
  }

  hook_events (): void {
    if (this.primary_surface !== undefined) {
      const canvas = this.surfaces[this.primary_surface].canvas
      canvas.sc = this.parent
      canvas.addEventListener('mousemove', Inputs.handle_mousemove)
      canvas.addEventListener('mousedown', Inputs.handle_mousedown)
      canvas.addEventListener('contextmenu', Inputs.handle_contextmenu)
      canvas.addEventListener('mouseup', Inputs.handle_mouseup)
      canvas.addEventListener('keydown', Inputs.handle_keydown)
      canvas.addEventListener('keyup', Inputs.handle_keyup)
      canvas.addEventListener('mouseout', handle_mouseout)
      canvas.addEventListener('mouseover', handle_mouseover)
      canvas.addEventListener('wheel', Inputs.handle_mousewheel)
      canvas.focus()

      this.focusListener = () => this.parent.send_clipboard_grab()
      // send host clipboard when the canvas is rendered initially
      this.focusListener()
      // register focus event to grab host clipboard when the canvas gets focus
      canvas.addEventListener('focus', this.focusListener)
    }
  }

  unhook_events (): void {
    if (this.primary_surface !== undefined) {
      const canvas = this.surfaces[this.primary_surface].canvas
      canvas.removeEventListener('mousemove', Inputs.handle_mousemove)
      canvas.removeEventListener('mousedown', Inputs.handle_mousedown)
      canvas.removeEventListener('contextmenu', Inputs.handle_contextmenu)
      canvas.removeEventListener('mouseup', Inputs.handle_mouseup)
      canvas.removeEventListener('keydown', Inputs.handle_keydown)
      canvas.removeEventListener('keyup', Inputs.handle_keyup)
      canvas.removeEventListener('mouseout', handle_mouseout)
      canvas.removeEventListener('mouseover', handle_mouseover)
      canvas.removeEventListener('wheel', Inputs.handle_mousewheel)
      canvas.removeEventListener('focus', this.focusListener)
    }
  }

  destroy_surfaces (): void {
    for (const s in this.surfaces) {
      this.delete_surface(this.surfaces[s].surface_id)
    }

    this.surfaces = undefined
  }
}

function handle_mouseover (e: MouseEvent): void {
  this.focus()
}

function handle_mouseout (e: MouseEvent): void {
  if (this.sc && this.sc.cursor && this.sc.cursor.spice_simulated_cursor) {
    this.sc.cursor.spice_simulated_cursor.style.display = 'none'
  }
  this.blur()
}

function handle_draw_jpeg_onload (this: HTMLImageElement & { o: any, alpha_img?: ImageData }): void {
  let temp_canvas = null
  let context: CanvasRenderingContext2D

  if ('streams' in this.o.sc && this.o.sc.streams[this.o.id]) {
    this.o.sc.streams[this.o.id].frames_loading--
  }

  /* ------------------------------------------------------------
  ** FIXME:
  **  The helper should be extended to be able to handle actual HtmlImageElements
  **  ...and the cache should be modified to do so as well
  **---------------------------------------------------------- */
  if (this.o.sc.surfaces[this.o.base.surface_id] === undefined) {
    // This can happen; if the jpeg image loads after our surface
    //  has been destroyed (e.g. open a menu, close it quickly),
    //  we'll find we have no surface.
    Utils.DEBUG > 2 && this.o.sc.log_info('Discarding jpeg; presumed lost surface ' + this.o.base.surface_id)
    temp_canvas = document.createElement('canvas')
    temp_canvas.setAttribute('width', this.o.base.box.right.toString())
    temp_canvas.setAttribute('height', this.o.base.box.bottom.toString())
    context = temp_canvas.getContext('2d')!
  } else {
    context = this.o.sc.surfaces[this.o.base.surface_id].canvas.context
  }

  if (this.alpha_img) {
    const c = document.createElement('canvas')
    const t = c.getContext('2d')!
    c.setAttribute('width', this.alpha_img.width.toString())
    c.setAttribute('height', this.alpha_img.height.toString())
    t.putImageData(this.alpha_img, 0, 0)
    t.globalCompositeOperation = 'source-in'
    t.drawImage(this, 0, 0)

    context.drawImage(c, this.o.base.box.left, this.o.base.box.top)

    if (this.o.descriptor &&
      (this.o.descriptor.flags & Constants.SPICE_IMAGE_FLAGS_CACHE_ME)) {
      if (!this.o.sc.cache) {
        this.o.sc.cache = {}
      }

      this.o.sc.cache[this.o.descriptor.id] = t.getImageData(0, 0,
        this.alpha_img.width,
        this.alpha_img.height)
    }
  } else {
    context.drawImage(this, this.o.base.box.left, this.o.base.box.top)

    // Give the Garbage collector a clue to recycle this; avoids
    //  fairly massive memory leaks during video playback
    this.onload = undefined
    this.src = Utils.EMPTY_GIF_IMAGE

    if (this.o.descriptor &&
      (this.o.descriptor.flags & Constants.SPICE_IMAGE_FLAGS_CACHE_ME)) {
      if (!this.o.sc.cache) {
        this.o.sc.cache = {}
      }

      this.o.sc.cache[this.o.descriptor.id] = context.getImageData(this.o.base.box.left, this.o.base.box.top,
        this.o.base.box.right - this.o.base.box.left,
        this.o.base.box.bottom - this.o.base.box.top)
    }
  }

  if (temp_canvas == null) {
    if (Utils.DUMP_DRAWS && this.o.sc.parent.dump_id) {
      const debug_canvas = document.createElement('canvas')
      debug_canvas.setAttribute('id', this.o.tag + '.' +
        this.o.sc.surfaces[this.o.base.surface_id].draw_count + '.' +
        this.o.base.surface_id + '@' + this.o.base.box.left + 'x' + this.o.base.box.top)
      debug_canvas.getContext('2d').drawImage(this, 0, 0)
      document.getElementById(this.o.sc.parent.dump_id).appendChild(debug_canvas)
    }

    this.o.sc.surfaces[this.o.base.surface_id].draw_count++
  }

  if (this.o.sc.streams[this.o.id] && 'report' in this.o.sc.streams[this.o.id]) {
    process_stream_data_report(this.o.sc, this.o.id, this.o.msg_mmtime, this.o.msg_mmtime - this.o.sc.parent.relative_now())
  }
}

function process_mjpeg_stream_data (sc: SpiceDisplayConn, m: any, time_until_due: number): void {
  /* If we are currently processing an mjpeg frame when a new one arrives,
     and the new one is 'late', drop the new frame.  This helps the browsers
     keep up, and provides rate control feedback as well */
  if (time_until_due < 0 && sc.streams[m.base.id].frames_loading > 0) {
    if ('report' in sc.streams[m.base.id]) {
      sc.streams[m.base.id].report.num_drops++
    }
    return
  }

  let tmpstr = 'data:image/jpeg,'
  const img = new Image()
  const qdv = new Uint8Array(m.data)
  for (let i = 0; i < qdv.length; i++) {
    tmpstr += '%'
    if (qdv[i] < 16) {
      tmpstr += '0'
    }
    tmpstr += qdv[i].toString(16)
  }
  const strm_base = new Messages.SpiceMsgDisplayBase()
  strm_base.surface_id = sc.streams[m.base.id].surface_id
  strm_base.box = m.dest || sc.streams[m.base.id].dest
  strm_base.clip = sc.streams[m.base.id].clip
  img.o = {
    base: strm_base,
    tag: 'mjpeg.' + m.base.id,
    descriptor: null,
    sc,
    id: m.base.id,
    msg_mmtime: m.base.multi_media_time
  }
  img.onload = handle_draw_jpeg_onload
  img.src = tmpstr

  sc.streams[m.base.id].frames_loading++
}

function process_stream_data_report (sc: SpiceDisplayConn, id: number, msg_mmtime: number, time_until_due: number): void {
  sc.streams[id].report.num_frames++
  if (sc.streams[id].report.start_frame_mm_time == 0) {
    sc.streams[id].report.start_frame_mm_time = msg_mmtime
  }

  if (sc.streams[id].report.num_frames > sc.streams[id].max_window_size ||
    (msg_mmtime - sc.streams[id].report.start_frame_mm_time) > sc.streams[id].timeout_ms) {
    sc.streams[id].report.end_frame_mm_time = msg_mmtime
    sc.streams[id].report.last_frame_delay = time_until_due

    const msg = new Messages.SpiceMiniData()
    msg.build_msg(Constants.SPICE_MSGC_DISPLAY_STREAM_REPORT, sc.streams[id].report)
    sc.send_msg(msg)

    sc.streams[id].report.start_frame_mm_time = 0
    sc.streams[id].report.num_frames = 0
    sc.streams[id].report.num_drops = 0
  }
}

function handle_video_source_open (e: Event): void {
  const media = e.target as MediaSource
  const stream = media.stream
  const p = media.spiceconn

  if (stream.source_buffer) {
    return
  }

  let s: SourceBuffer
  try {
    s = media.addSourceBuffer(Webm.Constants.SPICE_VP8_CODEC)
  } catch (e) {
    p.log_err('Codec ' + Webm.Constants.SPICE_VP8_CODEC + ' not available.')
    return
  }

  stream.source_buffer = s
  s.spiceconn = p
  s.stream = stream

  listen_for_video_events(stream)

  const h = new Webm.Header()
  const te = new Webm.VideoTrackEntry(stream.stream_width, stream.stream_height)
  const t = new Webm.Tracks(te)

  const mb = new ArrayBuffer(h.buffer_size() + t.buffer_size())
  const b = h.to_buffer(mb)
  t.to_buffer(mb, b)

  s.addEventListener('error', handle_video_buffer_error, false)
  s.addEventListener('updateend', handle_append_video_buffer_done, false)

  append_video_buffer(s, mb)
}

function handle_video_source_ended (e: Event): void {
  const media = e.target as MediaSource
  const p = media.spiceconn
  p.log_err('Video source unexpectedly ended.')
}

function handle_video_source_closed (e: Event): void {
  const media = e.target as MediaSource
  const p = media.spiceconn
  p.log_err('Video source unexpectedly closed.')
}

function append_video_buffer (sb: SourceBuffer, mb: ArrayBuffer): void {
  try {
    sb.stream.append_okay = false
    sb.appendBuffer(mb)
  } catch (e) {
    const p = sb.spiceconn
    p.log_err('Error invoking appendBuffer: ' + (e as Error).message)
  }
}

function handle_append_video_buffer_done (e: Event): void {
  const sb = e.target as SourceBuffer
  const stream = sb.stream

  if (stream.current_frame && 'report' in stream) {
    const sc = stream.media.spiceconn
    const t = stream.current_frame.msg_mmtime
    process_stream_data_report(sc, stream.id, t, t - sc.parent.relative_now())
  }

  if (stream.queue.length > 0) {
    stream.current_frame = stream.queue.shift()
    append_video_buffer(stream.source_buffer, stream.current_frame.mb)
  } else {
    stream.append_okay = true
  }

  if (!stream.video) {
    if (Utils.STREAM_DEBUG > 0) {
      console.log('Stream id ' + stream.id + ' received updateend after video is gone.')
    }
    return
  }

  if (stream.video.buffered.length > 0 &&
    stream.video.currentTime < stream.video.buffered.start(stream.video.buffered.length - 1)) {
    console.log('Video appears to have fallen behind; advancing to ' +
      stream.video.buffered.start(stream.video.buffered.length - 1))
    stream.video.currentTime = stream.video.buffered.start(stream.video.buffered.length - 1)
  }

  /* Modern browsers try not to auto play video. */
  if (stream.video.paused && stream.video.readyState >= 2) {
    stream.video.play()
  }

  if (Utils.STREAM_DEBUG > 1) {
    console.log(stream.video.currentTime + ':id ' + stream.id + ' updateend ' + Utils.dump_media_element(stream.video))
  }
}

function handle_video_buffer_error (e: Event): void {
  const sb = e.target as SourceBuffer
  const p = sb.spiceconn
  p.log_err('source_buffer error ' + (e as unknown as { message: string }).message)
}

function push_or_queue (stream: any, msg: any, mb: ArrayBuffer): void {
  const frame: any = {
    msg_mmtime: msg.base.multi_media_time,
    mb
  }

  if (stream.append_okay) {
    stream.current_frame = frame
    append_video_buffer(stream.source_buffer, mb)
  } else {
    stream.queue.push(frame)
  }
}

function video_simple_block (stream: any, msg: any, keyframe: boolean): void {
  const simple = new Webm.SimpleBlock(msg.base.multi_media_time - stream.cluster_time, msg.data, keyframe)
  const mb = new ArrayBuffer(simple.buffer_size())
  simple.to_buffer(mb)

  push_or_queue(stream, msg, mb)
}

function new_video_cluster (stream: any, msg: any): void {
  stream.cluster_time = msg.base.multi_media_time
  const c = new Webm.Cluster(stream.cluster_time - stream.start_time, msg.data)

  const mb = new ArrayBuffer(c.buffer_size())
  c.to_buffer(mb)

  push_or_queue(stream, msg, mb)

  video_simple_block(stream, msg, true)
}

function process_video_stream_data (stream: any, msg: any): void {
  if (stream.start_time == 0) {
    stream.start_time = msg.base.multi_media_time
    new_video_cluster(stream, msg)
  } else if (msg.base.multi_media_time - stream.cluster_time >= Webm.Constants.MAX_CLUSTER_TIME) {
    new_video_cluster(stream, msg)
  } else {
    video_simple_block(stream, msg, false)
  }
}

function video_handle_event_debug (e: Event): void {
  const s = (e.target as HTMLVideoElement).spice_stream
  if (s.video) {
    if (Utils.STREAM_DEBUG > 0 || s.video.buffered.length > 1) {
      console.log(s.video.currentTime + ':id ' + s.id + ' event ' + e.type +
        Utils.dump_media_element(s.video))
    }
  }

  if (Utils.STREAM_DEBUG > 1 && s.media) {
    console.log('  media_source ' + Utils.dump_media_source(s.media))
  }

  if (Utils.STREAM_DEBUG > 1 && s.source_buffer) {
    console.log('  source_buffer ' + Utils.dump_source_buffer(s.source_buffer))
  }

  if (Utils.STREAM_DEBUG > 1 || s.queue.length > 1) {
    console.log('  queue len ' + s.queue.length + '; append_okay: ' + s.append_okay)
  }
}

function video_debug_listen_for_one_event (this: HTMLVideoElement, name: string): void {
  this.addEventListener(name, video_handle_event_debug)
}

function listen_for_video_events (stream: any): void {
  const video_0_events = [
    'abort', 'error'
  ]

  const video_1_events = [
    'loadstart', 'suspend', 'emptied', 'stalled', 'loadedmetadata', 'loadeddata', 'canplay',
    'canplaythrough', 'playing', 'waiting', 'seeking', 'seeked', 'ended', 'durationchange',
    'play', 'pause', 'ratechange'
  ]

  const video_2_events = [
    'timeupdate',
    'progress',
    'resize',
    'volumechange'
  ]

  video_0_events.forEach(video_debug_listen_for_one_event, stream.video)
  if (Utils.STREAM_DEBUG > 0) {
    video_1_events.forEach(video_debug_listen_for_one_event, stream.video)
  }
  if (Utils.STREAM_DEBUG > 1) {
    video_2_events.forEach(video_debug_listen_for_one_event, stream.video)
  }
}
