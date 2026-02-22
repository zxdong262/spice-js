# spice-client

[English](./README.md)

[spice-html5](https://gitlab.freedesktop.org/spice/spice-html5.git) 的 TypeScript 移植版 - SPICE 协议的 JavaScript 客户端。

## 归属说明

**本项目是原始 [spice-html5](https://gitlab.freedesktop.org/spice/spice-html5.git) 项目的 TypeScript 移植版。**

- **原始项目**: https://gitlab.freedesktop.org/spice/spice-html5.git
- **原始作者**: SPICE Project <spice-devel@lists.freedesktop.org> (https://www.spice-space.org)
- **原始许可证**: LGPL-3.0-or-later

**所有荣誉归于原始作者。** 本项目仅做了以下工作：
- 将 JavaScript 代码转换为 TypeScript
- 添加了单元测试
- 使用 Vite 实现了现代化的构建流程
- 添加了 LZ4 图像压缩支持

TypeScript 转换和构建配置代码是在 Trae Solo Coder 模式下借助 GLM-5 模型辅助生成的。

## 许可证

本项目采用 GNU 通用公共许可证 v3.0 或更高版本授权 - 详见 [LICENSE](LICENSE) 文件。

本项目包含以下文件的副本：
- [COPYING](COPYING) - GNU 通用公共许可证 v3.0
- [COPYING.LESSER](COPYING.LESSER) - GNU 通用公共许可证 v3.0

## 安装

```bash
npm install spice-client
```

## 使用方法

### ES Modules

```javascript
import { SpiceMainConn, Constants } from 'spice-client';

const spice = new SpiceMainConn({
  uri: 'ws://localhost:5959',
  password: 'your-password',
  onsuccess: () => console.log('已连接！'),
  onerror: (e) => console.error('错误：', e)
});
```

### CommonJS

```javascript
const { SpiceMainConn, Constants } = require('spice-client');
```

### 浏览器全局变量 (IIFE)

引入压缩后的包：

```html
<script src="node_modules/spice-client/dist/global/spice-client.min.js"></script>
<script>
  const spice = new SpiceClient.SpiceMainConn({
    uri: 'ws://localhost:5959',
    password: 'your-password'
  });
</script>
```

## 环境要求

1. 现代浏览器（Firefox、Chrome 或 Edge）
2. WebSocket 代理（例如 [websockify](https://github.com/novnc/websockify)）
3. SPICE 服务器

## 快速开始

1. 启动 SPICE 服务器
2. 启动 websockify：
   ```bash
   websockify 5959 localhost:5900
   ```
3. 使用客户端连接

## API

### 导出

| 导出 | 描述 |
|--------|-------------|
| `SpiceMainConn` | SPICE 主连接类 |
| `SpiceConn` | 基础 SPICE 连接 |
| `SpiceDisplayConn` | 显示通道连接 |
| `SpiceInputsConn` | 输入（键盘/鼠标）通道 |
| `SpiceCursorConn` | 光标通道连接 |
| `SpicePlaybackConn` | 音频播放通道 |
| `SpicePortConn` | 端口通道连接 |
| `Constants` | SPICE 协议常量 |
| `handle_file_dragover` | 文件拖放处理函数 |
| `handle_file_drop` | 文件释放处理函数 |
| `resize_helper` | 调整大小辅助函数 |
| `handle_resize` | 调整大小处理函数 |
| `sendCtrlAltDel` | 发送 Ctrl+Alt+Del 组合键 |

## 构建

```bash
# 构建所有格式（ESM、CJS、浏览器全局压缩版）
npm run build
```

构建输出：
```
dist/
├── esm/           # ES Module 构建
├── cjs/           # CommonJS 构建
└── global/        # 浏览器用压缩版 IIFE
```

## 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 监听模式运行测试
npm run test:watch

# 运行端到端测试
npm run test:e2e
```

## 相关项目

- [spice-html5](https://gitlab.freedesktop.org/spice/spice-html5.git) - 原始 JavaScript 实现
- [websockify](https://github.com/novnc/websockify) - WebSocket 转 TCP 代理
- [SPICE Project](https://www.spice-space.org/) - 官方 SPICE 项目
- [Electerm](https://github.com/electerm/electerm) - 使用此库的终端/SSH/SFTP/Spice/Telnet/Ftp/RDP/VNC/Serial 客户端
