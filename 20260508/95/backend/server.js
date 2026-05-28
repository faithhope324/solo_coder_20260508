const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const { processVideo, getTaskStatus, cancelTask } = require('./services/videoProcessor');
const { generateJSONReport, generatePDFReport } = require('./services/reportGenerator');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const FRAMES_DIR = path.join(__dirname, 'frames');
const REPORTS_DIR = path.join(__dirname, 'reports');

[UPLOAD_DIR, FRAMES_DIR, REPORTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

app.use('/frames', express.static(FRAMES_DIR));
app.use('/reports', express.static(REPORTS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const taskId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${taskId}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }
});

app.post('/api/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const taskId = path.parse(req.file.filename).name;
    const videoPath = req.file.path;
    const videoName = req.file.originalname;

    processVideo(taskId, videoPath, videoName);

    res.json({
      taskId,
      message: 'Video uploaded successfully, processing started',
      status: 'processing'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

app.post('/api/youtube', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    const taskId = uuidv4();
    processVideo(taskId, null, 'YouTube Video', url);

    res.json({
      taskId,
      message: 'YouTube URL accepted, processing started',
      status: 'processing'
    });
  } catch (error) {
    console.error('YouTube error:', error);
    res.status(500).json({ error: 'Failed to process YouTube URL' });
  }
});

app.get('/api/status/:taskId', (req, res) => {
  const { taskId } = req.params;
  const status = getTaskStatus(taskId);

  if (!status) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(status);
});

app.post('/api/cancel/:taskId', (req, res) => {
  const { taskId } = req.params;
  const cancelled = cancelTask(taskId);

  if (!cancelled) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ message: 'Task cancelled successfully' });
});

app.get('/api/report/:taskId/json', (req, res) => {
  const { taskId } = req.params;
  const status = getTaskStatus(taskId);

  if (!status || status.status !== 'completed') {
    return res.status(404).json({ error: 'Report not available' });
  }

  const reportPath = generateJSONReport(taskId, status);
  res.download(reportPath, `summary-${taskId}.json`);
});

app.get('/api/report/:taskId/pdf', (req, res) => {
  const { taskId } = req.params;
  const status = getTaskStatus(taskId);

  if (!status || status.status !== 'completed') {
    return res.status(404).json({ error: 'Report not available' });
  }

  generatePDFReport(taskId, status, (pdfPath) => {
    res.download(pdfPath, `summary-${taskId}.pdf`);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});