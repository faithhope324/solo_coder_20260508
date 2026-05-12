const express = require('express');
const multer = require('multer');
const { SpeechClient } = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const port = 3000;

// 设置静态文件目录
app.use(express.static('public'));
app.use(express.json());

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// 确保上传目录存在
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 初始化Google Speech客户端
const speechClient = new SpeechClient();

// 转换音频格式
function convertAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .audioCodec('libopus')
      .audioFrequency(48000)
      .toFormat('webm')
      .on('end', () => resolve())
      .on('error', (error) => reject(error))
      .run();
  });
}

// 语音识别端点
app.post('/api/recognize', upload.single('audio'), async (req, res) => {
  try {
    let audioPath = req.file.path;
    let convertedPath = null;
    
    // 检查文件扩展名，需要转换的格式
    const ext = path.extname(req.file.originalname).toLowerCase();
    const needConversion = ['.m4a', '.spx', '.mp3', '.wav', '.ogg'].includes(ext);
    
    if (needConversion) {
      // 生成转换后的文件路径
      convertedPath = path.join('uploads', Date.now() + '.webm');
      await convertAudio(audioPath, convertedPath);
      audioPath = convertedPath;
    }
    
    const audio = {
      content: fs.readFileSync(audioPath).toString('base64')
    };
    
    const config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'zh-CN'
    };
    
    const request = {
      audio: audio,
      config: config
    };
    
    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    
    // 删除临时文件
    fs.unlinkSync(req.file.path);
    if (convertedPath) {
      fs.unlinkSync(convertedPath);
    }
    
    res.json({ transcription });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '语音识别失败' });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});