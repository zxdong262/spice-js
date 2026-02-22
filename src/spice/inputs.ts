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

import * as Messages from './spicemsg'
import { SpiceMsgcMousePosition, SpiceMsgcMouseMotion, SpiceMsgcMousePress, SpiceMsgcMouseRelease } from './mouse'
import { Constants } from './enums'
import { KeyNames } from './atKeynames'
import { SpiceConn } from './spiceconn'
import { DEBUG } from './utils'

function parse_keyboard_modifiers (modifiers: number): { num_lock: boolean, caps_lock: boolean, scroll_lock: boolean } {
  return {
    scroll_lock: (modifiers & Constants.SPICE_KEYBOARD_MODIFIER_FLAGS_SCROLL_LOCK) !== 0,
    num_lock: (modifiers & Constants.SPICE_KEYBOARD_MODIFIER_FLAGS_NUM_LOCK) !== 0,
    caps_lock: (modifiers & Constants.SPICE_KEYBOARD_MODIFIER_FLAGS_CAPS_LOCK) !== 0
  }
}

/* ----------------------------------------------------------------------------
 ** Modifier Keystates
 **     These need to be tracked because focus in and out can get the keyboard
 **     out of sync.
 **------------------------------------------------------------------------ */
let Shift_state: boolean | -1 = -1
let Ctrl_state: boolean | -1 = -1
let Alt_state: boolean | -1 = -1
let Meta_state: boolean | -1 = -1

/* ----------------------------------------------------------------------------
**  SpiceInputsConn
**      Drive the Spice Inputs channel (e.g. mouse + keyboard)
**-------------------------------------------------------------------------- */
export class SpiceInputsConn extends SpiceConn {
  mousex: number | undefined
  mousey: number | undefined
  button_state: number = 0
  waiting_for_ack: number = 0
  keyboard_modifiers: number | undefined

  constructor (...args: any[]) {
    super(...args)
  }

  process_channel_message (msg: any): boolean {
    if (msg.type == Constants.SPICE_MSG_INPUTS_INIT) {
      const inputs_init = new Messages.SpiceMsgInputsInit(msg.data)
      this.keyboard_modifiers = inputs_init.keyboard_modifiers
      DEBUG > 1 && console.log('MsgInputsInit - modifier ' + this.keyboard_modifiers)
      if (this.parent) {
        this.parent.emit('keyboard_modifiers', parse_keyboard_modifiers(this.keyboard_modifiers))
      }
      return true
    }
    if (msg.type == Constants.SPICE_MSG_INPUTS_KEY_MODIFIERS) {
      const key = new Messages.SpiceMsgInputsKeyModifiers(msg.data)
      this.keyboard_modifiers = key.keyboard_modifiers
      DEBUG > 1 && console.log('MsgInputsKeyModifiers - modifier ' + this.keyboard_modifiers)
      if (this.parent) {
        this.parent.emit('keyboard_modifiers', parse_keyboard_modifiers(this.keyboard_modifiers))
      }
      return true
    }
    if (msg.type == Constants.SPICE_MSG_INPUTS_MOUSE_MOTION_ACK) {
      DEBUG > 1 && console.log('mouse motion ack')
      this.waiting_for_ack -= Constants.SPICE_INPUT_MOTION_ACK_BUNCH
      return true
    }
    return false
  }
}

/* ----------------------------------------------------------------------------
**  Event handlers for mouse and keyboard events
**-------------------------------------------------------------------------- */
export function handle_mousemove (this: { sc: any }, e: MouseEvent) {
  const msg = new Messages.SpiceMiniData()
  let move
  if (this.sc.mouse_mode == Constants.SPICE_MOUSE_MODE_CLIENT) {
    move = new SpiceMsgcMousePosition(this.sc, e)
    msg.build_msg(Constants.SPICE_MSGC_INPUTS_MOUSE_POSITION, move)
  } else {
    move = new SpiceMsgcMouseMotion(this.sc, e)
    msg.build_msg(Constants.SPICE_MSGC_INPUTS_MOUSE_MOTION, move)
  }
  if (this.sc && this.sc.inputs && this.sc.inputs.state === 'ready') {
    if (this.sc.inputs.waiting_for_ack < (2 * Constants.SPICE_INPUT_MOTION_ACK_BUNCH)) {
      this.sc.inputs.send_msg(msg)
      this.sc.inputs.waiting_for_ack++
    } else {
      DEBUG > 0 && this.sc.log_info('Discarding mouse motion')
    }
  }

  if (this.sc && this.sc.cursor && this.sc.cursor.spice_simulated_cursor) {
    this.sc.cursor.spice_simulated_cursor.style.display = 'block'
    this.sc.cursor.spice_simulated_cursor.style.left = e.pageX - this.sc.cursor.spice_simulated_cursor.spice_hot_x + 'px'
    this.sc.cursor.spice_simulated_cursor.style.top = e.pageY - this.sc.cursor.spice_simulated_cursor.spice_hot_y + 'px'
    e.preventDefault()
  }
}

export function handle_mousedown (this: { sc: any }, e: MouseEvent) {
  const press = new SpiceMsgcMousePress(this.sc, e)
  const msg = new Messages.SpiceMiniData()
  msg.build_msg(Constants.SPICE_MSGC_INPUTS_MOUSE_PRESS, press)
  if (this.sc && this.sc.inputs && this.sc.inputs.state === 'ready') {
    this.sc.inputs.send_msg(msg)
  }

  e.preventDefault()
}

export function handle_contextmenu (this: any, e: MouseEvent) {
  e.preventDefault()
  return false
}

export function handle_mouseup (this: { sc: any }, e: MouseEvent) {
  const release = new SpiceMsgcMouseRelease(this.sc, e)
  const msg = new Messages.SpiceMiniData()
  msg.build_msg(Constants.SPICE_MSGC_INPUTS_MOUSE_RELEASE, release)
  if (this.sc && this.sc.inputs && this.sc.inputs.state === 'ready') {
    this.sc.inputs.send_msg(msg)
  }

  e.preventDefault()
}

export function handle_mousewheel (this: { sc: any }, e: WheelEvent) {
  const press = new SpiceMsgcMousePress()
  const release = new SpiceMsgcMouseRelease()
  if (e.deltaY < 0) {
    press.button = release.button = Constants.SPICE_MOUSE_BUTTON_UP
  } else {
    press.button = release.button = Constants.SPICE_MOUSE_BUTTON_DOWN
  }
  press.buttons_state = 0
  release.buttons_state = 0

  const msg = new Messages.SpiceMiniData()
  msg.build_msg(Constants.SPICE_MSGC_INPUTS_MOUSE_PRESS, press)
  if (this.sc && this.sc.inputs && this.sc.inputs.state === 'ready') {
    this.sc.inputs.send_msg(msg)
  }

  msg.build_msg(Constants.SPICE_MSGC_INPUTS_MOUSE_RELEASE, release)
  if (this.sc && this.sc.inputs && this.sc.inputs.state === 'ready') {
    this.sc.inputs.send_msg(msg)
  }

  e.preventDefault()
}

export function handle_keydown (this: { sc: any }, e: KeyboardEvent) {
  const key = new Messages.SpiceMsgcKeyDown(e)
  const msg = new Messages.SpiceMiniData()
  check_and_update_modifiers(e, key.code, this.sc)
  msg.build_msg(Constants.SPICE_MSGC_INPUTS_KEY_DOWN, key)
  if (this.sc && this.sc.inputs && this.sc.inputs.state === 'ready') {
    this.sc.inputs.send_msg(msg)
  }

  e.preventDefault()
}

export function handle_keyup (this: { sc: any }, e: KeyboardEvent) {
  const key = new Messages.SpiceMsgcKeyUp(e)
  const msg = new Messages.SpiceMiniData()
  check_and_update_modifiers(e, key.code, this.sc)
  msg.build_msg(Constants.SPICE_MSGC_INPUTS_KEY_UP, key)
  if (this.sc && this.sc.inputs && this.sc.inputs.state === 'ready') {
    this.sc.inputs.send_msg(msg)
  }

  e.preventDefault()
}

export function sendCtrlAltDel (sc: any) {
  if (sc && sc.inputs && sc.inputs.state === 'ready') {
    const key = new Messages.SpiceMsgcKeyDown()
    const msg = new Messages.SpiceMiniData()

    update_modifier(true, KeyNames.KEY_LCtrl, sc)
    update_modifier(true, KeyNames.KEY_Alt, sc)

    key.code = KeyNames.KEY_KP_Decimal
    msg.build_msg(Constants.SPICE_MSGC_INPUTS_KEY_DOWN, key)
    sc.inputs.send_msg(msg)
    msg.build_msg(Constants.SPICE_MSGC_INPUTS_KEY_UP, key)
    sc.inputs.send_msg(msg)

    if (Ctrl_state == false) update_modifier(false, KeyNames.KEY_LCtrl, sc)
    if (Alt_state == false) update_modifier(false, KeyNames.KEY_Alt, sc)
  }
}

function update_modifier (state: boolean, code: number, sc: any) {
  const msg = new Messages.SpiceMiniData()
  if (!state) {
    var key = new Messages.SpiceMsgcKeyUp()
    key.code = (0x80 | code)
    msg.build_msg(Constants.SPICE_MSGC_INPUTS_KEY_UP, key)
  } else {
    var key = new Messages.SpiceMsgcKeyDown()
    key.code = code
    msg.build_msg(Constants.SPICE_MSGC_INPUTS_KEY_DOWN, key)
  }

  sc.inputs.send_msg(msg)
}

function check_and_update_modifiers (e: KeyboardEvent, code: number, sc: any) {
  if (Shift_state === -1) {
    Shift_state = e.shiftKey
    Ctrl_state = e.ctrlKey
    Alt_state = e.altKey
    Meta_state = e.metaKey
  }

  if (code === KeyNames.KEY_ShiftL) {
    Shift_state = true
  } else if (code === KeyNames.KEY_Alt) {
    Alt_state = true
  } else if (code === KeyNames.KEY_LCtrl) {
    Ctrl_state = true
  } else if (code === 0xE0B5) {
    Meta_state = true
  } else if (code === (0x80 | KeyNames.KEY_ShiftL)) {
    Shift_state = false
  } else if (code === (0x80 | KeyNames.KEY_Alt)) {
    Alt_state = false
  } else if (code === (0x80 | KeyNames.KEY_LCtrl)) {
    Ctrl_state = false
  } else if (code === (0x80 | 0xE0B5)) {
    Meta_state = false
  }

  if (sc && sc.inputs && sc.inputs.state === 'ready') {
    if (Shift_state != e.shiftKey) {
      console.log('Shift state out of sync')
      update_modifier(e.shiftKey, KeyNames.KEY_ShiftL, sc)
      Shift_state = e.shiftKey
    }
    if (Alt_state != e.altKey) {
      console.log('Alt state out of sync')
      update_modifier(e.altKey, KeyNames.KEY_Alt, sc)
      Alt_state = e.altKey
    }
    if (Ctrl_state != e.ctrlKey) {
      console.log('Ctrl state out of sync')
      update_modifier(e.ctrlKey, KeyNames.KEY_LCtrl, sc)
      Ctrl_state = e.ctrlKey
    }
    if (Meta_state != e.metaKey) {
      console.log('Meta state out of sync')
      update_modifier(e.metaKey, 0xE0B5, sc)
      Meta_state = e.metaKey
    }
  }
}
