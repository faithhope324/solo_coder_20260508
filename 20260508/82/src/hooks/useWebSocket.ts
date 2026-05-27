import { useEffect, useRef, useCallback } from 'react';
import { processMessage } from '@/utils/binaryParser';
import useTrajectoryStore from '@/store/useTrajectoryStore';
import type { ControlMessage } from '../../shared/types.js';

let globalWs: WebSocket | null = null;
let globalUrl: string | null = null;
let globalSendMessage: ((message: ControlMessage) => void) | null = null;

export function useWebSocket(url: string = '/ws') {
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const {
    setConnectionStatus,
    setMeta,
    setCurrentFrameData,
    addPhysicsData,
    setCompressionRatio,
    addBytesReceived,
    updateFps,
    setError,
    setSendMessage,
    meta,
  } = useTrajectoryStore();

  const sendMessage = useCallback((message: ControlMessage) => {
    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
      console.log('Sending message:', message);
      globalWs.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not open, cannot send message:', message, 'readyState:', globalWs?.readyState);
    }
  }, []);

  const connect = useCallback(() => {
    if (globalWs && globalWs.readyState === WebSocket.OPEN && globalUrl === url) {
      return;
    }

    if (globalWs) {
      try {
        globalWs.close();
      } catch (e) {}
      globalWs = null;
    }

    setConnectionStatus('connecting');
    console.log('Attempting WebSocket connection to:', url);

    try {
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      globalWs = ws;
      globalUrl = url;
      globalSendMessage = sendMessage;

      ws.onopen = () => {
        console.log('WebSocket connected to:', url);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        setError(null);
        setSendMessage(sendMessage);
        sendMessage({ type: 'init' });
      };

      ws.onmessage = (event) => {
        if (!(event.data instanceof ArrayBuffer)) {
          console.warn('Received non-binary message');
          return;
        }

        const currentMeta = useTrajectoryStore.getState().meta;
        const currentPrevPositions = useTrajectoryStore.getState().previousPositions;
        const atomCount = currentMeta?.atomCount || 0;

        const result = processMessage(
          event.data,
          atomCount,
          currentPrevPositions
        );

        if (!result) return;

        addBytesReceived(event.data.byteLength);
        setCompressionRatio(result.compressionRatio);

        if (result.type === 'meta' && result.meta) {
          setMeta(result.meta);
        }

        if (result.type === 'frame' && result.frame && result.positions) {
          setCurrentFrameData(result.frame, result.positions);
          addPhysicsData({
            frame: result.frame.frame,
            temperature: result.frame.temperature,
            potentialEnergy: result.frame.potentialEnergy,
            kineticEnergy: result.frame.kineticEnergy,
            time: result.frame.time,
          });
          updateFps();
        }

        if (result.type === 'error') {
          setError('Received error from server');
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error event:', event);
        console.error('WebSocket readyState:', ws.readyState);
        console.error('WebSocket url:', url);
        setConnectionStatus('error');
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (globalWs === ws) {
          setConnectionStatus('disconnected');
          setSendMessage(null);
          globalWs = null;
          globalUrl = null;
          globalSendMessage = null;

          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current - 1), 10000);
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setError('Max reconnection attempts reached');
          }
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('error');
      setError('Failed to connect to server');
    }
  }, [url, setConnectionStatus, setMeta, setCurrentFrameData, addPhysicsData, setCompressionRatio, addBytesReceived, updateFps, setError, setSendMessage, sendMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (globalWs) {
      globalWs.close();
      globalWs = null;
      globalUrl = null;
      globalSendMessage = null;
    }

    setConnectionStatus('disconnected');
    setSendMessage(null);
  }, [setConnectionStatus, setSendMessage]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connect,
    disconnect,
    isConnected: meta !== null,
  };
}

export default useWebSocket;
