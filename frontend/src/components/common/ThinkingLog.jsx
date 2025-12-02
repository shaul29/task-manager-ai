/**
 * ThinkingLog Component - Displays AI thinking process in real-time
 */

import { useState, useEffect } from 'react';
import './ThinkingLog.css';

const ThinkingLog = ({ taskId, onComplete, onError, isLive = true }) => {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(isLive ? 'connecting' : 'complete');

  useEffect(() => {
    // Don't connect if not live
    if (!isLive) {
      console.log('ThinkingLog: Skipping connection (not live)', { isLive });
      return;
    }
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('accessToken');

    const url = `${API_URL}/api/tasks/${taskId}/ai_analyze_stream/?token=${token}`;
    console.log('ThinkingLog: Connecting to SSE', url);

    // Create EventSource for SSE
    const eventSource = new EventSource(url);

    // Handle connection open
    eventSource.onopen = () => {
      console.log('ThinkingLog: Connection opened');
      setStatus('streaming');
    };

    // Handle 'start' events
    eventSource.addEventListener('start', (e) => {
      console.log('ThinkingLog: Received start event', e.data);
      const data = JSON.parse(e.data);
      setLogs((prev) => [...prev, data]);
    });

    // Handle 'progress' events
    eventSource.addEventListener('progress', (e) => {
      console.log('ThinkingLog: Received progress event', e.data);
      const data = JSON.parse(e.data);
      setLogs((prev) => [...prev, data]);
    });

    // Handle 'complete' events
    eventSource.addEventListener('complete', (e) => {
      console.log('ThinkingLog: Received complete event', e.data);
      const data = JSON.parse(e.data);
      setLogs((prev) => [...prev, data]);
      setStatus('complete');
      eventSource.close();

      // Notify parent component
      if (onComplete) {
        onComplete(data.data);
      }
    });

    // Handle 'error' events from server
    eventSource.addEventListener('error', (e) => {
      console.log('ThinkingLog: Received error event', e);
      const data = e.data ? JSON.parse(e.data) : { message: 'Server error' };
      setLogs((prev) => [...prev, { type: 'error', message: data.message }]);
      setStatus('error');
      eventSource.close();

      // Notify parent component
      if (onError) {
        onError(data.message);
      }
    });

    // Handle connection errors
    eventSource.onerror = (e) => {
      console.error('ThinkingLog: Connection error', e);
      setStatus('error');
      setLogs((prev) => [...prev, { type: 'error', message: '❌ Connection lost or failed to connect' }]);
      eventSource.close();

      if (onError) {
        onError('Connection failed');
      }
    };

    // Cleanup on unmount
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [taskId, onComplete, onError, isLive]);

  return (
    <div className="thinking-log">
      <div className="thinking-log-header">
        <h3 className="thinking-log-title">AI Thinking Process</h3>
        <span className={`thinking-log-status status-${status}`}>
          {status === 'connecting' && '🔌 Connecting...'}
          {status === 'streaming' && '⚡ Analyzing...'}
          {status === 'complete' && '✅ Complete'}
          {status === 'error' && '❌ Error'}
        </span>
      </div>

      <div className="thinking-log-content">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`thinking-log-item ${log.type} animate-fade-in`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <span className="log-message">{log.message}</span>
            {log.step && <span className="log-step">{log.step}</span>}
          </div>
        ))}

        {status === 'streaming' && (
          <div className="thinking-log-item thinking animate-pulse">
            <span className="log-message">
              <span className="thinking-dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThinkingLog;
