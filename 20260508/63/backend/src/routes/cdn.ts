import { Router, Response } from 'express';
import { z } from 'zod';
import { URL } from 'url';
import { AppDataSource } from '../config/database';
import { Domain } from '../entities/Domain';
import { Task } from '../entities/Task';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getCdnOverview, getHourlyStats } from '../services/mockCdn';

const isUrlBelongsToDomain = (url: string, domain: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const normalizedDomain = domain.toLowerCase();

    return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
  } catch (e) {
    return false;
  }
};

const router = Router();

router.get('/overview/:domainId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const domainId = parseInt(req.params.domainId);
    const domainRepo = AppDataSource.getRepository(Domain);

    const domain = await domainRepo.findOne({
      where: { id: domainId, user: { id: user.id } },
    });

    if (!domain) {
      return res.status(404).json({ message: '域名不存在' });
    }

    const overview = getCdnOverview(domain.domain);
    res.json(overview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取 CDN 概览失败' });
  }
});

router.get('/stats/:domainId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const domainId = parseInt(req.params.domainId);
    const hours = parseInt(req.query.hours as string) || 24;
    const domainRepo = AppDataSource.getRepository(Domain);

    const domain = await domainRepo.findOne({
      where: { id: domainId, user: { id: user.id } },
    });

    if (!domain) {
      return res.status(404).json({ message: '域名不存在' });
    }

    const stats = getHourlyStats(domain.domain, hours);
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取统计数据失败' });
  }
});

const preheatSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(1000),
  domainId: z.number(),
});

const refreshSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(1000),
  domainId: z.number(),
  type: z.enum(['file', 'directory']).default('file'),
});

router.post('/preheat', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { urls, domainId } = preheatSchema.parse(req.body);
    const domainRepo = AppDataSource.getRepository(Domain);

    const domain = await domainRepo.findOne({
      where: { id: domainId, user: { id: user.id } },
    });

    if (!domain) {
      return res.status(404).json({ message: '域名不存在' });
    }

    for (const url of urls) {
      if (!isUrlBelongsToDomain(url, domain.domain)) {
        return res.status(400).json({ message: `URL ${url} 不属于该域名` });
      }
    }

    const taskRepo = AppDataSource.getRepository(Task);
    const task = taskRepo.create({
      urls: JSON.stringify(urls),
      type: 'preheat',
      status: 'pending',
      domain,
      user,
      totalCount: urls.length,
    });

    await taskRepo.save(task);

    res.status(201).json({
      message: '预热任务提交成功',
      taskId: task.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '参数验证失败', errors: error.errors });
    }
    console.error(error);
    res.status(500).json({ message: '提交预热任务失败' });
  }
});

router.post('/refresh', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { urls, domainId, type } = refreshSchema.parse(req.body);
    const domainRepo = AppDataSource.getRepository(Domain);

    const domain = await domainRepo.findOne({
      where: { id: domainId, user: { id: user.id } },
    });

    if (!domain) {
      return res.status(404).json({ message: '域名不存在' });
    }

    for (const url of urls) {
      if (!isUrlBelongsToDomain(url, domain.domain)) {
        return res.status(400).json({ message: `URL ${url} 不属于该域名` });
      }
    }

    const taskRepo = AppDataSource.getRepository(Task);
    const task = taskRepo.create({
      urls: JSON.stringify(urls),
      type: 'refresh',
      status: 'pending',
      domain,
      user,
      totalCount: urls.length,
    });

    await taskRepo.save(task);

    res.status(201).json({
      message: '刷新任务提交成功',
      taskId: task.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '参数验证失败', errors: error.errors });
    }
    console.error(error);
    res.status(500).json({ message: '提交刷新任务失败' });
  }
});

export default router;
