import { useEffect, useRef } from 'react';
import { useTransactionStore } from '../store/useTransactionStore';
import type { WebSocketMessage } from '../types';

const WS_URL = window.location.protocol === 'https:'
  ? `wss://${window.location.host}/ws`
  : `ws://${window.location.host}/ws`;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const {
    addTransaction,
    setTransactions,
    setStats,
    setDetectionRateHistory,
    setConnected,
  } = useTransactionStore();

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);

            switch (message.type) {
              case 'transaction':
                addTransaction(message.data);
                break;
              case 'history':
                setTransactions(message.data);
                break;
              case 'stats':
                setStats(message.data);
                break;
              case 'detectionRate':
                setDetectionRateHistory(message.data);
                break;
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnected(false);
        };

        ws.onclose = () => {
          setConnected(false);
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        };
      } catch (e) {
        console.error('Failed to create WebSocket:', e);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [addTransaction, setTransactions, setStats, setDetectionRateHistory, setConnected]);

  return null;
}
