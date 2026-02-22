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
import { SpiceDataView } from './spicedataview'

class SpiceMsgcMousePosition {
  display_id: number
  buttons_state: number
  x: number
  y: number

  constructor (sc: { buttons_state: number, mousex: number, mousey: number }, e?: { offsetX: number, offsetY: number }) {
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

  constructor (sc?: { buttons_state: number }, e?: { button: number }) {
    if (e) {
      this.button = e.button + 1
      this.buttons_state = 1 << e.button
      if (sc) sc.buttons_state = this.buttons_state
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

  constructor (sc?: { buttons_state: number }, e?: { button: number }) {
    if (e) {
      this.button = e.button + 1
      this.buttons_state = 0
      if (sc) sc.buttons_state = this.buttons_state
    } else {
      this.button = Constants.SPICE_MOUSE_BUTTON_LEFT
      this.buttons_state = 0
    }
  }

  to_buffer: (a: ArrayBuffer, at?: number) => number = SpiceMsgcMousePress.prototype.to_buffer
  buffer_size: () => number = SpiceMsgcMousePress.prototype.buffer_size
}

export {
  SpiceMsgcMousePosition,
  SpiceMsgcMouseMotion,
  SpiceMsgcMousePress,
  SpiceMsgcMouseRelease
}
