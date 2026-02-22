import express from "express";
import expressWs from "express-ws";
import { createServer } from "http";
import { WebSocket } from "ws";
import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
expressWs(app, server);

const PORT = 3001;
const LOG_DIR = path.join(__dirname, "../../../logs");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logFilePath = path.join(LOG_DIR, "server.log");
const webLogFilePath = path.join(LOG_DIR, "web.log");

function logToFile(message: string, file: string = logFilePath) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(file, logMessage);
  console.log(logMessage.trim());
}

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const spiceConnections = new Map<string, WebSocket>();

app.post("/api/log", (req, res) => {
  const { level, message, timestamp } = req.body;
  const logMessage = `[${level.toUpperCase()}] ${message}`;
  logToFile(logMessage, webLogFilePath);
  res.json({ success: true });
});

app.get("/api/logs", (req, res) => {
  try {
    const serverLog = fs.existsSync(logFilePath) ? fs.readFileSync(logFilePath, "utf-8") : "";
    const webLog = fs.existsSync(webLogFilePath) ? fs.readFileSync(webLogFilePath, "utf-8") : "";
    res.json({
      serverLog: serverLog.split("\n").slice(-100).join("\n"),
      webLog: webLog.split("\n").slice(-100).join("\n"),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to read logs" });
  }
});

app.ws("/ws/spice/:sessionId", (ws, req) => {
  const sessionId = req.params.sessionId;
  const { host = "192.168.2.31", port = "5908" } = req.query;

  logToFile(`New SPICE WebSocket connection: sessionId=${sessionId}, host=${host}, port=${port}`);

  let tcpSocket: net.Socket | null = null;
  let isClosed = false;

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    logToFile(`Cleaning up connection: sessionId=${sessionId}`);

    if (tcpSocket) {
      tcpSocket.destroy();
      tcpSocket = null;
    }

    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }

    spiceConnections.delete(sessionId);
  };

  ws.on("message", (data: Buffer) => {
    if (isClosed || !tcpSocket) return;

    try {
      tcpSocket.write(data);
    } catch (error) {
      logToFile(`Error writing to TCP socket: ${error}`);
      cleanup();
    }
  });

  ws.on("close", () => {
    logToFile(`WebSocket closed: sessionId=${sessionId}`);
    cleanup();
  });

  ws.on("error", (error) => {
    logToFile(`WebSocket error: ${error}`);
    cleanup();
  });

  tcpSocket = net.createConnection({ host: host as string, port: parseInt(port as string) }, () => {
    logToFile(`TCP connection established to ${host}:${port}`);
    spiceConnections.set(sessionId, ws);
  });

  tcpSocket.on("data", (data: Buffer) => {
    if (isClosed) return;

    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    } catch (error) {
      logToFile(`Error sending to WebSocket: ${error}`);
      cleanup();
    }
  });

  tcpSocket.on("close", () => {
    logToFile(`TCP connection closed: sessionId=${sessionId}`);
    cleanup();
  });

  tcpSocket.on("error", (error: Error) => {
    logToFile(`TCP connection error: ${error}`);
    cleanup();
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    connections: spiceConnections.size,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({ health: "ok" });
});

server.listen(PORT, () => {
  logToFile(`SPICE proxy server running on port ${PORT}`);
  logToFile(`Test host: 192.168.2.31:5908`);
});

process.on("uncaughtException", (error) => {
  logToFile(`Uncaught exception: ${error}`);
});

process.on("unhandledRejection", (reason, promise) => {
  logToFile(`Unhandled rejection: ${reason}`);
});
