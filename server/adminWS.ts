import { WebSocketServer, WebSocket } from "ws";
import { type Server } from "node:http";
import { verifyToken } from "./middleware/adminAuth";

let wss: WebSocketServer | null = null;

export function setupAdminWS(server: Server) {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    // Only handle our own admin WS path — let Vite HMR handle everything else
    if (url.pathname !== "/__admin_ws") return;

    const token = url.searchParams.get("token");
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    const payload = verifyToken(token);
    if (!payload) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    wss!.handleUpgrade(req, socket, head, (ws) => {
      (ws as any).__admin = payload;
      wss!.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "connected" }));

    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);

    ws.on("close", () => clearInterval(heartbeat));
    ws.on("error", () => clearInterval(heartbeat));
  });

  console.log("[ws] Admin WebSocket server ready at /__admin_ws");
}

export function broadcast(event: string, data?: unknown) {
  if (!wss) return;
  const msg = JSON.stringify({ type: event, data, ts: Date.now() });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}
