import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const EVENT_QUERY_MAP: Record<string, string[]> = {
  team_updated:      ["/api/admin/team", "/api/admin/stats"],
  team_created:      ["/api/admin/team", "/api/admin/stats"],
  team_deleted:      ["/api/admin/team", "/api/admin/stats"],
  portfolio_updated: ["/api/admin/portfolio", "/api/admin/stats"],
  portfolio_created: ["/api/admin/portfolio", "/api/admin/stats"],
  portfolio_deleted: ["/api/admin/portfolio", "/api/admin/stats"],
  message_updated:   ["/api/admin/messages", "/api/admin/stats"],
  message_deleted:   ["/api/admin/messages", "/api/admin/stats"],
  settings_updated:  ["/api/admin/settings", "/api/public/settings"],
  category_updated:  ["/api/admin/categories"],
  category_created:  ["/api/admin/categories"],
  category_deleted:  ["/api/admin/categories"],
  order_updated:     ["admin-orders", "/api/admin/stats"],
  order_created:     ["admin-orders", "/api/admin/stats"],
  new_order:         ["admin-orders", "/api/admin/stats"],
  signup_request:    ["/api/admin/stats", "admin-stats"],
  signup_approved:   ["/api/admin/stats", "admin-stats"],
  signup_rejected:   ["/api/admin/stats", "admin-stats"],
};

export type WSMessage = { type: string; data?: any; ts?: number };

export function useAdminWS(onNotification?: (msg: WSMessage) => void) {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef(onNotification);
  cbRef.current = onNotification;

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    const host = window.location.hostname;
    const serverlessHost = host.endsWith(".vercel.app") || host.endsWith(".now.sh");
    if (serverlessHost || import.meta.env.VITE_DISABLE_ADMIN_WS === "true") return;

    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${proto}//${window.location.host}/__admin_ws?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const msg: WSMessage = JSON.parse(e.data);
          if (msg.type === "ping") return;
          const keys = EVENT_QUERY_MAP[msg.type];
          if (keys) keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
          // Fire notification callback for events that need UI alerts
          if (cbRef.current) cbRef.current(msg);
        } catch {}
      };

      ws.onclose = () => {
        if (!destroyed) reconnectRef.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      destroyed = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [qc]);

  return wsRef;
}
