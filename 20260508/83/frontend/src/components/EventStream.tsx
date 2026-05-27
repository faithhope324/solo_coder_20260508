import React from 'react';
import { Event } from '../types';

const EVENT_TYPE_MAP: Record<string, string> = {
  pod_created: 'Pod 创建',
  pod_deleted: 'Pod 删除',
  pod_failed: 'Pod 失败',
  deployment_scaled: '扩缩容调整',
  container_started: '容器启动',
  container_stopped: '容器停止',
};

interface EventStreamProps {
  events: Event[];
}

const EventStream: React.FC<EventStreamProps> = ({ events }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventTypeLabel = (type: string) => {
    return EVENT_TYPE_MAP[type] || type;
  };

  return (
    <>
      <h2 className="section-title">
        <span className="status-dot critical"></span>
        事件流
      </h2>
      <div className="event-list">
        {events.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
            暂无事件
          </div>
        ) : (
          events.slice(0, 20).map((event) => (
            <div key={event.id} className="event-item">
              <div className="event-header">
                <span className={`event-type ${event.type}`}>{getEventTypeLabel(event.type)}</span>
                <span className="event-time">{formatTime(event.timestamp)}</span>
              </div>
              <div className="event-message">{event.message}</div>
              <div className="event-source">来源: {event.source}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default EventStream;
