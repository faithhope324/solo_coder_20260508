import { Router, Request, Response } from 'express';
import { dockerClient } from '../clients/docker';

const router = Router();

router.get('/containers', async (req: Request, res: Response) => {
  try {
    const containers = await dockerClient.getContainers();
    res.json(containers);
  } catch (error) {
    res.status(500).json({ error: '获取容器列表失败' });
  }
});

router.get('/containers/stats', async (req: Request, res: Response) => {
  try {
    const stats = await dockerClient.getContainerStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: '获取容器统计失败' });
  }
});

router.get('/health', (req: Request, res: Response) => {
  res.json({
    connected: dockerClient.isDockerConnected(),
    mode: dockerClient.isDockerConnected() ? 'docker' : 'mock',
  });
});

export default router;
