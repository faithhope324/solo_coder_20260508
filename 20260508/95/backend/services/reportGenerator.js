const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');

function generateJSONReport(taskId, status) {
  const report = {
    taskId,
    videoName: status.videoName,
    youtubeUrl: status.youtubeUrl,
    createdAt: status.createdAt,
    completedAt: status.completedAt,
    duration: status.duration,
    totalFrames: status.frames.length,
    summary: {
      sceneTypes: [...new Set(status.frames.map(f => f.sceneType))],
      keywords: [...new Set(status.frames.flatMap(f => f.keywords))],
      averageConfidence: (
        status.frames.reduce((sum, f) => sum + parseFloat(f.confidence), 0) / 
        status.frames.length
      ).toFixed(2)
    },
    frames: status.frames.map(frame => ({
      index: frame.index,
      timestamp: frame.timestamp,
      timecode: frame.timecode,
      description: frame.description,
      summary: frame.summary,
      sceneType: frame.sceneType,
      keywords: frame.keywords,
      confidence: frame.confidence,
      objects: frame.objects,
      imagePath: frame.path
    }))
  };

  const reportPath = path.join(REPORTS_DIR, `${taskId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return reportPath;
}

function generatePDFReport(taskId, status, callback) {
  const doc = new PDFDocument({ margin: 50 });
  const pdfPath = path.join(REPORTS_DIR, `${taskId}.pdf`);
  const stream = fs.createWriteStream(pdfPath);
  
  doc.pipe(stream);

  doc.fontSize(24)
     .fillColor('#1a365d')
     .text('Video Intelligence Summary Report', { align: 'center' })
     .moveDown();

  doc.fontSize(12)
     .fillColor('#4a5568')
     .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
     .moveDown(2);

  doc.fontSize(16)
     .fillColor('#2d3748')
     .text('Video Information')
     .moveDown(0.5);

  doc.fontSize(10)
     .fillColor('#000000')
     .text(`Video Name: ${status.videoName}`)
     .text(`Task ID: ${taskId}`)
     .text(`Created At: ${new Date(status.createdAt).toLocaleString()}`)
     .text(`Completed At: ${new Date(status.completedAt).toLocaleString()}`)
     .text(`Total Frames: ${status.frames.length}`)
     .moveDown(2);

  doc.fontSize(16)
     .fillColor('#2d3748')
     .text('Summary Statistics')
     .moveDown(0.5);

  const sceneTypes = [...new Set(status.frames.map(f => f.sceneType))];
  const avgConfidence = (
    status.frames.reduce((sum, f) => sum + parseFloat(f.confidence), 0) / 
    status.frames.length
  ).toFixed(2);

  doc.fontSize(10)
     .text(`Scene Types: ${sceneTypes.join(', ')}`)
     .text(`Average Confidence: ${avgConfidence}`)
     .moveDown(2);

  doc.fontSize(16)
     .fillColor('#2d3748')
     .text('Frame Details')
     .moveDown(1);

  status.frames.forEach((frame, index) => {
    if (index > 0 && index % 3 === 0) {
      doc.addPage();
    }

    doc.fontSize(12)
       .fillColor('#2b6cb0')
       .text(`Frame ${frame.index + 1} - ${frame.timecode}`)
       .moveDown(0.3);

    doc.fontSize(10)
       .fillColor('#000000')
       .text(`Scene: ${frame.sceneType}`)
       .text(`Confidence: ${frame.confidence}`)
       .text(`Description: ${frame.description}`)
       .text(`Keywords: ${frame.keywords.join(', ')}`)
       .moveDown(1);
  });

  doc.end();

  stream.on('finish', () => {
    callback(pdfPath);
  });
}

module.exports = {
  generateJSONReport,
  generatePDFReport
};