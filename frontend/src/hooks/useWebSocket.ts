import { useCallback, useEffect, useRef, useState } from "react";

export type WSStatus = "connecting" | "connected" | "disconnected";

export interface WSMessage {
  type: "status" | "response" | "tts_start" | "tts_end" | "error" | "transcription" | "tool_start" | "tool_end" | "tool_result" | "hitl_request";
  message?: string;
  text?: string;
  name?: string;
  card?: any;
}

interface UseWebSocketOptions {
  onBinaryChunk?: (chunk: ArrayBuffer) => void;
  onMessage?: (msg: WSMessage) => void;
  onAuthExpired?: () => void;
}

export function useWebSocket(
  sessionId: string,
  token: string | null,
  options: UseWebSocketOptions = {}
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const reconnectAttempts = useRef(0);
  const connIdRef = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [status, setStatus] = useState<WSStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);

  const connect = useCallback(() => {
    if (!token) return;

    clearTimeout(reconnectTimeout.current);

    const myId = ++connIdRef.current;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/api/v1/ws/${sessionId}?token=${token}`;

    setStatus("connecting");
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      if (myId !== connIdRef.current) return;
      setStatus("connected");
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      if (myId !== connIdRef.current) return;
      if (typeof event.data === "string") {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          console.log("[WS]", msg.type, msg.message || msg.text || "");
          optionsRef.current.onMessage?.(msg);
          setLastMessage(msg);
        } catch {
          // ignore malformed JSON
        }
      } else {
        // Binary data — ArrayBuffer or Blob
        const data = event.data;
        if (data instanceof ArrayBuffer) {
          console.log("[WS] binary (AB):", data.byteLength);
          optionsRef.current.onBinaryChunk?.(data);
        } else if (data instanceof Blob) {
          console.log("[WS] binary (Blob):", data.size);
          data.arrayBuffer().then((buf) => {
            optionsRef.current.onBinaryChunk?.(buf);
          });
        }
      }
    };

    ws.onclose = (event) => {
      if (myId !== connIdRef.current) return;
      setStatus("disconnected");
      wsRef.current = null;

      if (event.code === 4003) {
        optionsRef.current.onAuthExpired?.();
        return;
      }

      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
      reconnectAttempts.current += 1;
      reconnectTimeout.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [sessionId, token]);

  useEffect(() => {
    connect();
    return () => {
      connIdRef.current++;
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback(
    (data: { type: string; data?: string }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(data));
      }
    },
    []
  );

  return { status, lastMessage, send };
}
