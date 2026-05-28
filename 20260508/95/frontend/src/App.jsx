import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);

  const pollTaskStatus = useCallback(async (id) => {
    try {
      const response = await axios.get(`/api/status/${id}`);
      setTaskStatus(response.data);

      if (response.data.status === 'processing') {
        pollingRef.current = setTimeout(() => pollTaskStatus(id), 1000);
      } else {
        setIsProcessing(false);
      }
    } catch (err) {
      setError('获取任务状态失败');
      setIsProcessing(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  const handleFileUpload = async (file) => {
    if (!file || !file.type.startsWith('video/')) {
      setError('请上传有效的视频文件');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setTaskStatus(null);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setTaskId(response.data.taskId);
      pollTaskStatus(response.data.taskId);
    } catch (err) {
      setError('视频上传失败，请重试');
      setIsProcessing(false);
    }
  };

  const handleYoutubeSubmit = async (e) => {
    e.preventDefault();
    
    if (!youtubeUrl) {
      setError('请输入 YouTube 链接');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setTaskStatus(null);

    try {
      const response = await axios.post('/api/youtube', { url: youtubeUrl });
      setTaskId(response.data.taskId);
      pollTaskStatus(response.data.taskId);
    } catch (err) {
      setError('处理 YouTube 链接失败，请重试');
      setIsProcessing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const downloadReport = (format) => {
    window.open(`/api/report/${taskId}/${format}`, '_blank');
  };

  const resetUpload = () => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
    }
    setTaskId(null);
    setTaskStatus(null);
    setIsProcessing(false);
    setError(null);
    setYoutubeUrl('');
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🎬 视频智能摘要</h1>
        <p>上传视频文件或提供 YouTube 链接，AI 为您生成关键帧摘要</p>
      </div>

      {!taskId ? (
        <div className="card">
          <div className="tab-container">
            <button 
              className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              📁 上传视频
            </button>
            <button 
              className={`tab ${activeTab === 'youtube' ? 'active' : ''}`}
              onClick={() => setActiveTab('youtube')}
            >
              ▶️ YouTube 链接
            </button>
          </div>

          {activeTab === 'upload' && (
            <div
              className={`upload-area ${isDragging ? 'dragover' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon">📹</div>
              <h3>拖拽视频文件到此处</h3>
              <p>或点击选择文件</p>
              <button className="btn btn-primary" onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}>
                选择视频文件
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="file-input"
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />
            </div>
          )}

          {activeTab === 'youtube' && (
            <form onSubmit={handleYoutubeSubmit} className="youtube-form">
              <input
                type="url"
                placeholder="在此粘贴 YouTube 链接（如 https://www.youtube.com/watch?v=...）"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                {isProcessing ? '处理中...' : '生成摘要'}
              </button>
            </form>
          )}

          {error && <div className="error">{error}</div>}
        </div>
      ) : (
        <div className="card">
          {isProcessing && taskStatus && (
            <div className="progress-container">
              <div className="progress-header">
                <h4>
                  <span className="spinner"></span>
                  {taskStatus.stage}
                </h4>
                <span>{taskStatus.progress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${taskStatus.progress}%` }}
                ></div>
              </div>
              <div className="progress-text">
                任务 ID: {taskId} | 
                {taskStatus.totalFrames && ` 关键帧: ${taskStatus.processedFrames || 0}/${taskStatus.totalFrames}`}
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ marginTop: '15px' }}
                onClick={resetUpload}
              >
                取消
              </button>
            </div>
          )}

          {taskStatus?.status === 'completed' && (
            <div>
              <div className="summary-header">
                <h2>✅ 摘要生成完成</h2>
                <div className="download-buttons">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => downloadReport('json')}
                  >
                    📄 下载 JSON
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => downloadReport('pdf')}
                  >
                    📑 下载 PDF
                  </button>
                </div>
              </div>

              <div className="stats">
                <div className="stat-card">
                  <div className="stat-value">{taskStatus.frames?.length || 0}</div>
                  <div className="stat-label">关键帧数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {taskStatus.duration ? Math.floor(taskStatus.duration) : 0}s
                  </div>
                  <div className="stat-label">视频时长</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {taskStatus.frames?.length 
                      ? (taskStatus.frames.reduce((sum, f) => sum + parseFloat(f.confidence), 0) / 
                         taskStatus.frames.length).toFixed(2)
                      : '0.00'}
                  </div>
                  <div className="stat-label">平均置信度</div>
                </div>
              </div>

              <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>
                📊 时间轴摘要
              </h3>

              <div className="timeline">
                {taskStatus.frames?.map((frame, index) => (
                  <div key={index} className="frame-card">
                    <div className="frame-content">
                      <div 
                        className="frame-thumbnail"
                        style={{
                          background: `linear-gradient(135deg, #${(index * 123456).toString(16).slice(0, 6)} 0%, #${((index * 123456 + 567890) % 16777215).toString(16).slice(0, 6)} 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '3rem'
                        }}
                      >
                        🖼️
                      </div>
                      <div className="frame-info">
                        <span className="frame-timecode">{frame.timecode}</span>
                        <p className="frame-description">{frame.description}</p>
                        <div className="frame-keywords">
                          {frame.keywords?.map((keyword, i) => (
                            <span key={i} className="keyword">{keyword}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="frame-dot"></div>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <button className="btn btn-secondary" onClick={resetUpload}>
                  🔄 处理下一个视频
                </button>
              </div>
            </div>
          )}

          {taskStatus?.status === 'failed' && (
            <div>
              <div className="error">
                ❌ 处理失败: {taskStatus.error || '未知错误'}
              </div>
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button className="btn btn-primary" onClick={resetUpload}>
                  重试
                </button>
              </div>
            </div>
          )}

          {taskStatus?.status === 'cancelled' && (
            <div>
              <div className="error">
                ⏹️ 处理已取消
              </div>
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button className="btn btn-primary" onClick={resetUpload}>
                  重试
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;