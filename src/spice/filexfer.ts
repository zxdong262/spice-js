/*
   Copyright (C) 2014 Red Hat, Inc.

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

export class SpiceFileXferTask {
    id: number;
    file: File;
    progressbar_container: HTMLDivElement | null = null;
    progressbar: HTMLProgressElement | null = null;
    cancelled: boolean = false;

    constructor(id: number, file: File) {
        this.id = id;
        this.file = file;
    }

    create_progressbar(): void {
        var _this = this;
        var cancel = document.createElement("input");
        this.progressbar_container = document.createElement("div");
        this.progressbar = document.createElement("progress");

        cancel.type = 'button';
        cancel.value = 'Cancel';
        cancel.style.float = 'right';
        cancel.onclick = function() {
            _this.cancelled = true;
            _this.remove_progressbar();
        };

        if (this.progressbar) {
            this.progressbar.setAttribute('max', this.file.size.toString());
            this.progressbar.setAttribute('value', '0');
            this.progressbar.style.width = '100%';
            this.progressbar.style.margin = '4px auto';
            this.progressbar.style.display = 'inline-block';
        }

        if (this.progressbar_container) {
            this.progressbar_container.style.width = '90%';
            this.progressbar_container.style.margin = 'auto';
            this.progressbar_container.style.padding = '4px';
            this.progressbar_container.textContent = this.file.name;
            this.progressbar_container.appendChild(cancel);
            if (this.progressbar) {
                this.progressbar_container.appendChild(this.progressbar);
            }
            var xferArea = document.getElementById('spice-xfer-area');
            if (xferArea) {
                xferArea.appendChild(this.progressbar_container);
            }
        }
    }

    update_progressbar(value: number): void {
        if (this.progressbar) {
            this.progressbar.setAttribute('value', value.toString());
        }
    }

    remove_progressbar(): void {
        if (this.progressbar_container && this.progressbar_container.parentNode) {
            this.progressbar_container.parentNode.removeChild(this.progressbar_container);
        }
    }
}

export function handle_file_dragover(e: DragEvent): void {
    e.stopPropagation();
    e.preventDefault();
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
    }
}

export function handle_file_drop(e: DragEvent): void {
    var sc = (window as any).spice_connection;
    var files = e.dataTransfer?.files;

    e.stopPropagation();
    e.preventDefault();
    if (files) {
        for (var i = files.length - 1; i >= 0; i--) {
            if (files[i].type) { // do not copy a directory
                sc.file_xfer_start(files[i]);
            }
        }
    }
}
