import { Router, Response } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database';
import { Domain } from '../entities/Domain';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const domainSchema = z.object({
  domain: z.string().min(3).max(255),
  provider: z.enum(['aliyun', 'tencent', 'qiniu', 'aws', 'cloudflare']).default('aliyun'),
  region: z.string().default('CN'),
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const domainRepo = AppDataSource.getRepository(Domain);

    const domains = await domainRepo.find({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
    });

    res.json(domains);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取域名列表失败' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const domainId = parseInt(req.params.id);
    const domainRepo = AppDataSource.getRepository(Domain);

    const domain = await domainRepo.findOne({
      where: { id: domainId, user: { id: user.id } },
    });

    if (!domain) {
      return res.status(404).json({ message: '域名不存在' });
    }

    res.json(domain);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取域名详情失败' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { domain, provider, region } = domainSchema.parse(req.body);
    const domainRepo = AppDataSource.getRepository(Domain);

    const existingDomain = await domainRepo.findOne({
      where: { domain, user: { id: user.id } },
    });

    if (existingDomain) {
      return res.status(400).json({ message: '该域名已存在' });
    }

    const newDomain = domainRepo.create({
      domain,
      provider,
      region,
      cname: `${domain}.w.kunlunsl.com`,
      status: 'active',
      user,
    });

    await domainRepo.save(newDomain);
    res.status(201).json(newDomain);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '参数验证失败', errors: error.errors });
    }
    console.error(error);
    res.status(500).json({ message: '添加域名失败' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const domainId = parseInt(req.params.id);
    const { provider, region } = domainSchema.partial().parse(req.body);
    const domainRepo = AppDataSource.getRepository(Domain);

    const domain = await domainRepo.findOne({
      where: { id: domainId, user: { id: user.id } },
    });

    if (!domain) {
      return res.status(404).json({ message: '域名不存在' });
    }

    if (provider !== undefined) domain.provider = provider;
    if (region !== undefined) domain.region = region;

    await domainRepo.save(domain);
    res.json(domain);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '参数验证失败', errors: error.errors });
    }
    console.error(error);
    res.status(500).json({ message: '更新域名失败' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const domainId = parseInt(req.params.id);
    const domainRepo = AppDataSource.getRepository(Domain);

    const domain = await domainRepo.findOne({
      where: { id: domainId, user: { id: user.id } },
    });

    if (!domain) {
      return res.status(404).json({ message: '域名不存在' });
    }

    await domainRepo.remove(domain);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '删除域名失败' });
  }
});

export default router;
