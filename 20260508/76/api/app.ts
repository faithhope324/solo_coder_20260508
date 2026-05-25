import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import meetingsRouter from './routes/meetings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/meetings', meetingsRouter);

app.use('/data', express.static(path.join(__dirname, '..', 'data')));

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
