import * as express from 'express';
import * as cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from './config/database';
import { PORT } from './config';
import authRoutes from './routes/auth';
import domainRoutes from './routes/domains';
import cdnRoutes from './routes/cdn';
import taskRoutes from './routes/tasks';
import { startTaskProcessor } from './services/taskProcessor';

const app = express();

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/cdn', cdnRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

AppDataSource.initialize()
  .then(() => {
    console.log('Database connected');
    startTaskProcessor();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });
