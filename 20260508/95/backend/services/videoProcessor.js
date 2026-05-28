const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { generateImageDescriptions } = require('./imageCaptioner');

const tasks = new Map();
const FRAMES_DIR = path.join(__dirname, '..', 'frames');
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

function getTaskStatus(taskId) {
  return tasks.get(taskId) || null;
}

function updateTaskStatus(taskId, updates) {
  const task = tasks.get(taskId);
  if (task) {
    Object.assign(task, updates);
    tasks.set(taskId, task);
  }
}

function cancelTask(taskId) {
  const task = tasks.get(taskId);
  if (task) {
    task.cancelled = true;
    task.status = 'cancelled';
    return true;
  }
  return false;
}

function extractFrames(taskId, videoPath, frameInterval = 5) {
  return new Promise((resolve, reject) => {
    const taskFramesDir = path.join(FRAMES_DIR, taskId);
    
    if (!fs.existsSync(taskFramesDir)) {
      fs.mkdirSync(taskFramesDir, { recursive: true });
    }

    const framePattern = path.join(taskFramesDir, 'frame-%04d.jpg');
    let totalFrames = 0;
    let processedFrames = 0;

    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const duration = metadata.format.duration;
      const fps = 1 / frameInterval;
      totalFrames = Math.floor(duration * fps);

      updateTaskStatus(taskId, {
        progress: 10,
        stage: '正在抽取关键帧',
        totalFrames,
        duration
      });

      ffmpeg(videoPath)
        .outputOptions([
          `-vf fps=${fps}`,
          '-q:v 2',
          '-threads 2'
        ])
        .output(framePattern)
        .on('progress', (progress) => {
          const task = tasks.get(taskId);
          if (task && task.cancelled) {
            reject(new Error('Task cancelled'));
            return;
          }
          
          if (progress.percent) {
            const frameProgress = Math.floor(progress.percent * 0.5);
            updateTaskStatus(taskId, {
              progress: 10 + frameProgress,
              processedFrames: Math.floor((progress.percent / 100) * totalFrames)
            });
          }
        })
        .on('end', () => {
          fs.readdir(taskFramesDir, (err, files) => {
            if (err) {
              reject(err);
              return;
            }
            
            const frameFiles = files
              .filter(f => f.startsWith('frame-') && f.endsWith('.jpg'))
              .sort()
              .map((f, index) => ({
                filename: f,
                path: `/frames/${taskId}/${f}`,
                timestamp: index * frameInterval,
                timecode: formatTime(index * frameInterval)
              }));

            resolve(frameFiles);
          });
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  });
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

async function processVideo(taskId, videoPath, videoName, youtubeUrl = null) {
  tasks.set(taskId, {
    taskId,
    videoName,
    youtubeUrl,
    status: 'processing',
    progress: 0,
    stage: '初始化中',
    createdAt: new Date().toISOString(),
    frames: [],
    cancelled: false
  });

  try {
    updateTaskStatus(taskId, { progress: 5, stage: '正在准备视频' });

    let inputVideoPath = videoPath;
    
    if (youtubeUrl) {
      updateTaskStatus(taskId, { progress: 8, stage: '正在下载 YouTube 视频' });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const frames = await extractFrames(taskId, inputVideoPath, 5);

    updateTaskStatus(taskId, {
      progress: 60,
      stage: '正在生成图像描述'
    });

    const describedFrames = await generateImageDescriptions(taskId, frames, (progress) => {
      updateTaskStatus(taskId, {
        progress: 60 + Math.floor(progress * 0.35),
        stage: `正在生成描述 (${Math.floor(progress)}%)`
      });
    });

    updateTaskStatus(taskId, {
      status: 'completed',
      progress: 100,
      stage: '处理完成',
      frames: describedFrames,
      completedAt: new Date().toISOString()
    });

    if (inputVideoPath && inputVideoPath.startsWith(UPLOAD_DIR)) {
      setTimeout(() => {
        if (fs.existsSync(inputVideoPath)) {
          fs.unlinkSync(inputVideoPath);
        }
        const taskFramesDir = path.join(FRAMES_DIR, taskId);
        if (fs.existsSync(taskFramesDir)) {
          fs.rmSync(taskFramesDir, { recursive: true, force: true });
        }
      }, 60000);
    }

  } catch (error) {
    console.error(`Task ${taskId} failed:`, error);
    const task = tasks.get(taskId);
    const taskFramesDir = path.join(FRAMES_DIR, taskId);
    if (fs.existsSync(taskFramesDir)) {
      fs.rmSync(taskFramesDir, { recursive: true, force: true });
    }
    if (task && task.cancelled) {
      updateTaskStatus(taskId, { status: 'cancelled', error: error.message });
    } else {
      updateTaskStatus(taskId, { status: 'failed', error: error.message, progress: 0 });
    }
  }
}

module.exports = {
  processVideo,
  getTaskStatus,
  cancelTask
};