import { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { SolveRequest, ReportRequest } from '../../shared/types.js';
import jsPDF from 'jspdf';

export const solveSimulation = async (req: Request, res: Response) => {
  try {
    const requestData: SolveRequest = req.body;
    
    if (!requestData.config || !requestData.config.domainSize) {
      return res.status(400).json({
        success: false,
        error: 'Missing configuration: domainSize is required'
      });
    }

    const pythonPath = 'python';
    const solverPath = path.join(process.cwd(), 'api', 'python', 'solver.py');
    
    const pythonProcess = spawn(pythonPath, [solverPath]);
    
    let stdoutData = '';
    let stderrData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });
    
    pythonProcess.stdin.write(JSON.stringify(requestData));
    pythonProcess.stdin.end();
    
    const result = await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderrData || `Python process exited with code ${code}`));
        } else {
          try {
            const parsed = JSON.parse(stdoutData);
            resolve(parsed);
          } catch (e) {
            reject(new Error('Failed to parse Python output: ' + stdoutData));
          }
        }
      });
      
      pythonProcess.on('error', (err) => {
        reject(err);
      });
    });
    
    res.json(result);
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const generateReport = async (req: Request, res: Response) => {
  try {
    const reportData: ReportRequest = req.body;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(reportData.title || 'Electromagnetic Field Simulation Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const date = new Date().toLocaleString();
    doc.text(`Generated: ${date}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 10;
    
    if (reportData.author) {
      doc.text(`Author: ${reportData.author}`, margin, yPosition);
      yPosition += 8;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Simulation Setup', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const shapes = reportData.simulation.shapes;
    doc.text(`Number of objects: ${shapes.length}`, margin, yPosition);
    yPosition += 7;
    
    shapes.forEach((shape, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(`  ${index + 1}. ${shape.name} (${shape.type})`, margin, yPosition);
      yPosition += 6;
      doc.text(`     Material: ${shape.material.name}`, margin + 5, yPosition);
      yPosition += 6;
      doc.text(`     Permittivity: ${shape.material.permittivity} εr`, margin + 5, yPosition);
      yPosition += 6;
      doc.text(`     Conductivity: ${shape.material.conductivity} S/m`, margin + 5, yPosition);
      yPosition += 6;
      if (shape.boundaryCondition) {
        doc.text(`     Boundary: ${shape.boundaryCondition.type} = ${shape.boundaryCondition.value} V`, margin + 5, yPosition);
        yPosition += 6;
      }
    });
    
    yPosition += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Mesh Statistics', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const stats = reportData.result.meshStats;
    doc.text(`Number of nodes: ${stats.nodeCount}`, margin, yPosition);
    yPosition += 7;
    doc.text(`Number of elements: ${stats.elementCount}`, margin, yPosition);
    yPosition += 7;
    doc.text(`Solve time: ${reportData.result.solveTime.toFixed(2)} ms`, margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Results Summary', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const potentials = reportData.result.potential;
    const minV = Math.min(...potentials);
    const maxV = Math.max(...potentials);
    const avgV = potentials.reduce((a, b) => a + b, 0) / potentials.length;
    
    doc.text(`Potential range: ${minV.toExponential(4)} V to ${maxV.toExponential(4)} V`, margin, yPosition);
    yPosition += 7;
    doc.text(`Average potential: ${avgV.toExponential(4)} V`, margin, yPosition);
    yPosition += 7;
    
    const eFields = reportData.result.electricField;
    const eMagnitudes = eFields.map(e => Math.sqrt(e.x * e.x + e.y * e.y));
    const maxE = Math.max(...eMagnitudes);
    const avgE = eMagnitudes.reduce((a, b) => a + b, 0) / eMagnitudes.length;
    
    doc.text(`Max electric field: ${maxE.toExponential(4)} V/m`, margin, yPosition);
    yPosition += 7;
    doc.text(`Average electric field: ${avgE.toExponential(4)} V/m`, margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text('Report generated by Electromagnetic Field FEM Simulator', margin, 280);
    
    const pdfBuffer = doc.output('arraybuffer');
    const pdfBytes = Buffer.from(pdfBuffer);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="simulation_report.pdf"`);
    res.send(pdfBytes);
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const healthCheck = (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'running',
      python: 'available'
    }
  });
};
