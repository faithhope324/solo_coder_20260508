import { useEffect, useRef, useCallback } from 'react';
import { useMonitorStore } from '../store/useMonitorStore';
import type { WsMessage, WebRtcMetrics, Meeting, Participant } from '../../shared/types';
import { calculateQualityScore } from '../../shared/types';

const WS_URL = 'ws://localhost:3004/ws';

interface UseWebSocketOptions {
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCount = useRef(0);
  const isManualClose = useRef(false);
  
  const store = useMonitorStore();

  useEffect(() => {
    if (options.autoConnect === false) return;

    console.log('[WS] Connecting to:', WS_URL);
    isManualClose.current = false;

    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[WS] Connected');
          store.setConnected(true);
          reconnectCount.current = 0;
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WsMessage;
            console.log('[WS] Received:', message.type);

            switch (message.type) {
              case 'meetingStarted': {
                const data = message.data as Meeting & { participants?: Participant[] };
                store.setCurrentMeeting(data);
                store.setSimulationRunning(true);
                store.reset();
                if (data.participants) {
                  data.participants.forEach(p => store.addParticipant(p));
                }
                break;
              }

              case 'meetingEnded': {
                const data = message.data as Meeting & { endTime: number };
                store.setCurrentMeeting(data);
                store.setSimulationRunning(false);
                break;
              }

              case 'participantJoined': {
                const participant = message.data as Participant;
                store.addParticipant(participant);
                break;
              }

              case 'participantLeft': {
                const { id } = message.data as { id: string };
                store.removeParticipant(id);
                break;
              }

              case 'metrics': {
                const metrics = message.data as WebRtcMetrics;
                store.updateMetrics(metrics);
                break;
              }
            }
          } catch (e) {
            console.error('[WS] Parse error:', e);
          }
        };

        ws.onclose = (event) => {
          console.log('[WS] Closed:', event.code, event.reason);
          store.setConnected(false);
          store.setSimulationRunning(false);

          if (!isManualClose.current && reconnectCount.current < 5) {
            reconnectCount.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectCount.current), 10000);
            console.log(`[WS] Reconnect in ${delay}ms (${reconnectCount.current}/5)`);
            reconnectTimerRef.current = setTimeout(connect, delay);
          }
        };

        ws.onerror = (event) => {
          console.error('[WS] Error:', event);
        };
      } catch (e) {
        console.error('[WS] Create error:', e);
      }
    };

    connect();

    return () => {
      console.log('[WS] Cleanup');
      isManualClose.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      store.setConnected(false);
    };
  }, []);

  const send = useCallback((message: WsMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.log('[WS] Sent:', message.type, message.data?.action || '');
    } else {
      console.warn('[WS] Cannot send: not connected (readyState:', wsRef.current?.readyState, ')');
    }
  }, []);

  const sendControl = useCallback((action: string, params?: any) => {
    console.log('[WS] Control:', action, params || '');
    send({
      type: 'control',
      data: { action, params },
      timestamp: Date.now()
    });
  }, [send]);

  return {
    send,
    sendControl,
    isConnected: useMonitorStore(state => state.isConnected)
  };
}

export default useWebSocket;
