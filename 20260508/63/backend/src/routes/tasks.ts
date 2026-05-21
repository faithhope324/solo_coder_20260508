import { Router, Response } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database';
import { Task } from '../entities/Task';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const taskQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
  type: z.enum(['preheat', 'refresh']).optional(),
  status: z.enum(['pending', 'processing', 'success', 'failed']).optional(),
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { page, pageSize, type, status } = taskQuerySchema.parse(req.query);
    const taskRepo = AppDataSource.getRepository(Task);

    const where: any = { user: { id: user.id } };
    if (type) where.type = type;
    if (status) where.status = status;

    const [tasks, total] = await taskRepo.findAndCount({
      where,
      relations: ['domain'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const formattedTasks = tasks.map(task => ({
      ...task,
      urls: JSON.parse(task.urls),
    }));

    res.json({
      list: formattedTasks,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '参数验证失败', errors: error.errors });
    }
    console.error(error);
    res.status(500).json({ message: '获取任务列表失败' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const taskId = parseInt(req.params.id);
    const taskRepo = AppDataSource.getRepository(Task);

    const task = await taskRepo.findOne({
      where: { id: taskId, user: { id: user.id } },
      relations: ['domain'],
    });

    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }

    res.json({
      ...task,
      urls: JSON.parse(task.urls),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取任务详情失败' });
  }
});

router.get('/stats/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const taskRepo = AppDataSource.getRepository(Task);

    const [pending, processing, success, failed] = await Promise.all([
      taskRepo.count({ where: { user: { id: user.id }, status: 'pending' } }),
      taskRepo.count({ where: { user: { id: user.id }, status: 'processing' } }),
      taskRepo.count({ where: { user: { id: user.id }, status: 'success' } }),
      taskRepo.count({ where: { user: { id: user.id }, status: 'failed' } }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await taskRepo
      .createQueryBuilder('task')
      .where('task.userId = :userId', { userId: user.id })
      .andWhere('task.createdAt >= :today', { today })
      .getCount();

    res.json({
      pending,
      processing,
      success,
      failed,
      today: todayCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取任务统计失败' });
  }
});

export default router;
