class WebSocketManager {
    constructor(url, options = {}) {
        this.url = url;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
        this.reconnectDelay = options.reconnectDelay || 3000;
        this.heartbeatInterval = options.heartbeatInterval || 30000;
        this.heartbeatMessage = options.heartbeatMessage || JSON.stringify({ type: 'ping' });
        
        this.ws = null;
        this.eventHandlers = {
            open: [],
            message: [],
            close: [],
            error: [],
            data: []
        };
        
        this.isManualClose = false;
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
    }

    on(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(handler);
        }
        return this;
    }

    off(event, handler) {
        if (this.eventHandlers[event]) {
            const index = this.eventHandlers[event].indexOf(handler);
            if (index > -1) {
                this.eventHandlers[event].splice(index, 1);
            }
        }
        return this;
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (e) {
                    console.error(`Error in event handler for "${event}":`, e);
                }
            });
        }
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.isManualClose = false;
        
        try {
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = () => this.handleOpen();
            this.ws.onmessage = (event) => this.handleMessage(event);
            this.ws.onclose = (event) => this.handleClose(event);
            this.ws.onerror = (error) => this.handleError(error);
            
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    handleOpen() {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('open');
    }

    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'pong') {
                return;
            }
            
            this.emit('message', data);
            this.emit('data', data);
            
        } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
        }
    }

    handleClose(event) {
        this.stopHeartbeat();
        
        if (!this.isManualClose) {
            this.emit('close', event);
            this.scheduleReconnect();
        } else {
            this.emit('close', event);
        }
    }

    handleError(error) {
        console.error('WebSocket error:', error);
        this.emit('error', error);
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                try {
                    this.ws.send(this.heartbeatMessage);
                } catch (e) {
                        console.error('Failed to send heartbeat:', e);
                    }
            }
        }, this.heartbeatInterval);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
            return;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
        
        this.reconnectTimer = setTimeout(() => {
            console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
            this.connect();
        }, delay);
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            this.ws.send(message);
            return true;
        }
        return false;
    }

    close() {
        this.isManualClose = true;
        this.stopHeartbeat();
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    getReadyState() {
        return this.ws ? this.ws.readyState : WebSocket.CLOSED;
    }

    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

window.WebSocketManager = WebSocketManager;
