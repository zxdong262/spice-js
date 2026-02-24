import React, { useState, useEffect, useRef, useCallback } from "react";
import { SpiceMainConn, sendCtrlAltDel } from "../../spice/index.ts";

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

const WebLogger = {
  logs: [] as LogEntry[],

  log (level: string, message: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    this.logs.push(entry);
    if (this.logs.length > 1000) {
      this.logs.shift();
    }

    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(console.error);

    console.log(`[${level.toUpperCase()}] ${message}`);
  },

  info (message: string) {
    this.log("info", message);
  },

  warn (message: string) {
    this.log("warn", message);
  },

  error (message: string) {
    this.log("error", message);
  },

  debug (message: string) {
    this.log("debug", message);
  },
};

const App: React.FC = () => {
  const [host, setHost] = useState("192.168.2.31");
  const [port, setPort] = useState("5908");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [scaleView, setScaleView] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const spiceConnRef = useRef<SpiceMainConn | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/logs");
        const data = await response.json();
        const allLogs = (data.serverLog + "\n" + data.webLog)
          .split("\n")
          .filter((line: string) => line.trim())
          .map((line: string) => {
            const match = line.match(/\[([^\]]+)\]\s+(.+)/);
            if (match) {
              return {
                timestamp: new Date().toISOString(),
                level: match[1].toLowerCase(),
                message: match[2],
              };
            }
            return {
              timestamp: new Date().toISOString(),
              level: "info",
              message: line,
            };
          });
        setLogs(allLogs.slice(-100));
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const connect = useCallback(async () => {
    if (status !== "disconnected") return;

    setStatus("connecting");
    WebLogger.info(`Connecting to SPICE server at ${host}:${port}`);

    try {
      const sessionId = `session-${Date.now()}`;
      const wsUrl = `ws://localhost:3001/ws/spice/${sessionId}?host=${host}&port=${port}`;

      WebLogger.debug(`WebSocket URL: ${wsUrl}`);

      const spiceConn = new SpiceMainConn({
        uri: wsUrl,
        password: password || "",
        screen_id: "spice-screen",
        scale_view: scaleView,
        onsuccess: () => {
          setStatus("connected");
          WebLogger.info("SPICE connection established successfully");
          setDebugInfo("All right! Connection successful. Canvas should be rendering.");
        },
        onerror: (e: Error) => {
          WebLogger.error(`SPICE connection error: ${e.message}`);
          setStatus("disconnected");
          setDebugInfo(`Error: ${e.message}`);
        },
        onagent: () => {
          WebLogger.info("VD agent connected");
        },
      });

      spiceConnRef.current = spiceConn;
    } catch (error) {
      WebLogger.error(`Failed to connect: ${error}`);
      setStatus("disconnected");
      setDebugInfo(`Connection failed: ${error}`);
    }
  }, [host, port, password, status]);

  const disconnect = useCallback(() => {
    if (spiceConnRef.current) {
      spiceConnRef.current.stop();
      spiceConnRef.current = null;
    }
    setStatus("disconnected");
    WebLogger.info("Disconnected from SPICE server");
    setDebugInfo("Disconnected");
  }, []);

  const getStatusClass = () => {
    switch (status) {
      case "connected":
        return "status-connected";
      case "connecting":
        return "status-connecting";
      default:
        return "status-disconnected";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      default:
        return "Disconnected";
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>SPICE Client Demo</h1>
        <div className="connection-form">
          <input
            type="text"
            placeholder="Host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            disabled={status !== "disconnected"}
          />
          <input
            type="text"
            placeholder="Port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            disabled={status !== "disconnected"}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={status !== "disconnected"}
          />
          {status === "disconnected" ? (
            <button onClick={connect}>Connect</button>
          ) : (
            <button onClick={disconnect} disabled={status === "connecting"}>
              Disconnect
            </button>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "10px" }}>
            <input
              type="checkbox"
              checked={scaleView}
              onChange={(e) => setScaleView(e.target.checked)}
              disabled={status !== "disconnected"}
            />
            Scale View
          </label>
        </div>
      </div>

      <div className="main-content">
        <div className="spice-container">
          <div className="spice-screen" ref={screenRef}>
            <div id="spice-screen" style={{ width: "100%", height: "100%" }}></div>
          </div>
          <div className="status-bar">
            <span className={getStatusClass()}>{getStatusText()}</span>
            <span style={{ marginLeft: "20px" }}>
              {host}:{port}
            </span>
            {status === "connected" && (
              <button
                style={{ marginLeft: "20px" }}
                onClick={() => {
                  if (spiceConnRef.current) {
                    sendCtrlAltDel(spiceConnRef.current);
                    WebLogger.info("Sent Ctrl+Alt+Del to host");
                  }
                }}
              >
                Ctrl+Alt+Del
              </button>
            )}
          </div>
          <div className={`debug-info ${status === "connected" ? "success" : ""}`}>{debugInfo || "Ready to connect"}</div>
        </div>

        <div className="logs-panel">
          <div className="logs-header">Logs</div>
          <div className="logs-content">
            {logs.map((log, index) => (
              <div key={index} className={`log-entry log-${log.level}`}>
                [{log.timestamp}] {log.message}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
