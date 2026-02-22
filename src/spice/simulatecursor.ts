/*
   Copyright (C) 2013 by Jeremy P. White <jwhite@codeweavers.com>

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

/*----------------------------------------------------------------------------
**  SpiceSimulateCursor
**      Internet Explorer 10 does not support data uri's in cursor assignment.
**  This file provides a number of gimmicks to compensate.  First, if there
**  is a preloaded cursor available, we will use that.  Failing that, we will
**  simulate a cursor using an image that is moved around the screen.
**--------------------------------------------------------------------------*/

import { SpiceDataView } from './spicedataview.ts';
import { hex_sha1 } from './thirdparty/sha1.ts';

export namespace SpiceSimulateCursor {

    export const cursors: Record<string, string> = {};
    export const unknown_cursors: Record<string, string> = {};
    export let warned: boolean = false;

    export function add_cursor(sha1: string, value: string): void {
        cursors[sha1] = value;
    }

    export function unknown_cursor(sha1: string, curdata: string): void {
        if (!warned) {
            warned = true;
            alert("Internet Explorer does not support dynamic cursors.  " +
                  "This page will now simulate cursors with images, " +
                  "which will be imperfect.  We recommend using Chrome or Firefox instead.  " +
                  "\n\nIf you need to use Internet Explorer, you can create a static cursor " +
                  "file for each cursor your application uses.  " +
                  "View the console log for more information on creating static cursors for your environment.");
        }

        if (!unknown_cursors[sha1]) {
            unknown_cursors[sha1] = curdata;
            console.log('Unknown cursor.  Simulation required.  To avoid simulation for this cursor, create and include a custom javascript file, and add the following line:');
            console.log('SpiceCursorSimulator.add_cursor("' + sha1 + '"), "<your filename here>.cur");');
            console.log('And then run following command, redirecting output into <your filename here>.cur:');
            console.log('php -r "echo urldecode(\'' + curdata + '\');"');
        }
    }

    export function simulate_cursor(spicecursor: any, cursor: any, screen: HTMLElement, pngstr: string): void {
        var cursor_sha = hex_sha1(pngstr + ' ' + cursor.header.hot_spot_x + ' ' + cursor.header.hot_spot_y);
        if (typeof cursors[cursor_sha] !== 'undefined') {
            var curstr = 'url(' + cursors[cursor_sha] + '), default';
            screen.style.cursor = curstr;
        }

        if (window.getComputedStyle(screen, null).cursor == 'auto') {
            unknown_cursor(cursor_sha,
                create_icondir(cursor.header.width, cursor.header.height,
                cursor.data.byteLength, cursor.header.hot_spot_x, cursor.header.hot_spot_y) + pngstr);

            document.getElementById(spicecursor.parent.screen_id)?.style.setProperty('cursor', 'none');
            if (!spicecursor.spice_simulated_cursor) {
                spicecursor.spice_simulated_cursor = document.createElement('img');

                spicecursor.spice_simulated_cursor.style.position = 'absolute';
                spicecursor.spice_simulated_cursor.style.display = 'none';
                spicecursor.spice_simulated_cursor.style.overflow = 'hidden';

                spicecursor.spice_simulated_cursor.spice_screen = document.getElementById(spicecursor.parent.screen_id);

                spicecursor.spice_simulated_cursor.addEventListener('mousemove', handle_sim_mousemove);

                spicecursor.spice_simulated_cursor.spice_screen?.appendChild(spicecursor.spice_simulated_cursor);
            }

            spicecursor.spice_simulated_cursor.src = 'data:image/png,' + pngstr;

            spicecursor.spice_simulated_cursor.spice_hot_x = cursor.header.hot_spot_x;
            spicecursor.spice_simulated_cursor.spice_hot_y = cursor.header.hot_spot_y;

            spicecursor.spice_simulated_cursor.style.pointerEvents = "none";
        } else {
            if (spicecursor.spice_simulated_cursor) {
                spicecursor.spice_simulated_cursor.spice_screen?.removeChild(spicecursor.spice_simulated_cursor);
                delete spicecursor.spice_simulated_cursor;
            }
        }
    }

    export function handle_sim_mousemove(e: MouseEvent): boolean {
        var f = duplicate_mouse_event(e, this.spice_screen);
        return this.spice_screen.dispatchEvent(f);
    }

    export function duplicate_mouse_event(e: MouseEvent, target: Element): MouseEvent {
        var evt = document.createEvent("mouseevent") as MouseEvent;
        evt.initMouseEvent(e.type, true, true, e.view, e.detail,
            e.screenX, e.screenY, e.clientX, e.clientY,
            e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, e.relatedTarget);
        return evt;
    }

    export class ICONDIR {
        to_buffer(a: ArrayBuffer, at?: number): number {
            at = at || 0;
            var dv = new SpiceDataView(a);
            dv.setUint16(at, 0, true); at += 2;
            dv.setUint16(at, 2, true); at += 2;
            dv.setUint16(at, 1, true); at += 2;
            return at;
        }

        buffer_size(): number {
            return 6;
        }
    }

    export class ICONDIRENTRY {
        constructor(public width: number, public height: number, public bytes: number, public hot_x: number, public hot_y: number) {}

        to_buffer(a: ArrayBuffer, at?: number): number {
            at = at || 0;
            var dv = new SpiceDataView(a);
            dv.setUint8(at, this.width); at++;
            dv.setUint8(at, this.height); at++;
            dv.setUint8(at, 0); at++;  /* color palette count, unused */
            dv.setUint8(at, 0); at++;  /* reserved */
            dv.setUint16(at, this.hot_x, true); at += 2;
            dv.setUint16(at, this.hot_y, true); at += 2;
            dv.setUint32(at, this.bytes, true); at += 4;
            dv.setUint32(at, at + 4, true); at += 4;  /* Offset to bytes */
            return at;
        }

        buffer_size(): number {
            return 16;
        }
    }

    export function create_icondir(width: number, height: number, bytes: number, hot_x: number, hot_y: number): string {
        var i: number;
        var header = new ICONDIR();
        var entry = new ICONDIRENTRY(width, height, bytes, hot_x, hot_y);

        var mb = new ArrayBuffer(header.buffer_size() + entry.buffer_size());
        var at = header.to_buffer(mb);
        at = entry.to_buffer(mb, at);

        var u8 = new Uint8Array(mb);
        var str = "";
        for (i = 0; i < at; i++) {
            str += "%";
            if (u8[i] < 16) {
                str += "0";
            }
            str += u8[i].toString(16);
        }
        return str;
    }

}
