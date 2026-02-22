# spice-client

[中文](./README.cn.md) | [English](./README.md)

A TypeScript port of [spice-html5](https://gitlab.freedesktop.org/spice/spice-html5.git) - a JavaScript client for the SPICE protocol.

## Attribution

**This project is a TypeScript port of the original [spice-html5](https://gitlab.freedesktop.org/spice/spice-html5.git) project.**

- **Original Project**: https://gitlab.freedesktop.org/spice/spice-html5.git
- **Original Authors**: SPICE Project <spice-devel@lists.freedesktop.org> (https://www.spice-space.org)
- **Original License**: LGPL-3.0-or-later

**All credit goes to the original authors.** This project simply:
- Converted the JavaScript code to TypeScript
- Added unit tests
- Implemented a modern build process with Vite
- Added LZ4 image compression support
- Optimized message processing to handle multiple ArrayBuffers directly, avoiding buffer concatenation overhead
- Uses native DataView for single ArrayBuffer operations, falling back to custom SpiceDataView only for multi-buffer scenarios

The TypeScript conversion and build setup code was generated with the assistance of the GLM-5 model in Trae Solo Coder mode.

## License

This project is licensed under the GNU Lesser General Public License v3.0 or later - see the [LICENSE](LICENSE) file for details.

This project includes copies of:
- [COPYING](COPYING) - GNU General Public License v3.0
- [COPYING.LESSER](COPYING.LESSER) - GNU Lesser General Public License v3.0

## Installation

```bash
npm install spice-client
```

## Usage

### ES Modules

```javascript
import { SpiceMainConn, Constants } from 'spice-client';

const spice = new SpiceMainConn({
  uri: 'ws://localhost:5959',
  password: 'your-password',
  onsuccess: () => console.log('Connected!'),
  onerror: (e) => console.error('Error:', e)
});
```

### CommonJS

```javascript
const { SpiceMainConn, Constants } = require('spice-client');
```

### Browser Global (IIFE)

Include the minified bundle:

```html
<script src="node_modules/spice-client/dist/global/spice-client.min.js"></script>
<script>
  const spice = new SpiceClient.SpiceMainConn({
    uri: 'ws://localhost:5959',
    password: 'your-password'
  });
</script>
```

## Requirements

1. A modern browser (Firefox, Chrome, or Edge)
2. A WebSocket proxy (e.g., [websockify](https://github.com/novnc/websockify))
3. A SPICE server

## Quick Start

1. Start your SPICE server
2. Start websockify:
   ```bash
   websockify 5959 localhost:5900
   ```
3. Connect using the client

## API

### Exports

| Export | Description |
|--------|-------------|
| `SpiceMainConn` | Main SPICE connection class |
| `SpiceConn` | Base SPICE connection |
| `SpiceDisplayConn` | Display channel connection |
| `SpiceInputsConn` | Inputs (keyboard/mouse) channel |
| `SpiceCursorConn` | Cursor channel connection |
| `SpicePlaybackConn` | Audio playback channel |
| `SpicePortConn` | Port channel connection |
| `Constants` | SPICE protocol constants |
| `handle_file_dragover` | File drag handler |
| `handle_file_drop` | File drop handler |
| `resize_helper` | Resize helper function |
| `handle_resize` | Resize handler |
| `sendCtrlAltDel` | Send Ctrl+Alt+Del sequence |

## Build

```bash
# Build all formats (ESM, CJS, global minified)
npm run build
```

Build output:
```
dist/
├── esm/           # ES Module build
├── cjs/           # CommonJS build
└── global/        # Minified IIFE for browsers
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e
```

## Related Projects

- [spice-html5](https://gitlab.freedesktop.org/spice/spice-html5.git) - Original JavaScript implementation
- [websockify](https://github.com/novnc/websockify) - WebSocket to TCP proxy
- [SPICE Project](https://www.spice-space.org/) - Official SPICE project
- [Electerm](https://github.com/electerm/electerm) - Terminal/SSH/SFTP/Spice/Telnet/Ftp/RDP/VNC/Serial client using this library
