import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Domain } from '../entities/Domain';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = registerSchema.parse(req.body);
    const userRepo = AppDataSource.getRepository(User);
    const domainRepo = AppDataSource.getRepository(Domain);

    const existingUser = await userRepo.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({ message: '用户名或邮箱已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = userRepo.create({
      username,
      email,
      password: hashedPassword,
    });

    await userRepo.save(user);

    const sampleDomains = [
      { domain: `${username}.example.com`, provider: 'aliyun', cname: `${username}.example.com.w.kunlunsl.com`, region: 'CN' },
      { domain: `cdn.${username}.com`, provider: 'tencent', cname: `cdn.${username}.com.cdn.dnsv1.com`, region: 'CN' },
      { domain: `static.${username}.org`, provider: 'qiniu', cname: `static.${username}.org.qiniudns.com`, region: 'CN' },
    ];

    for (const d of sampleDomains) {
      const domain = domainRepo.create({
        ...d,
        user,
        status: 'active',
      });
      await domainRepo.save(domain);
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '参数验证失败', errors: error.errors });
    }
    console.error(error);
    res.status(500).json({ message: '注册失败' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '参数验证失败', errors: error.errors });
    }
    console.error(error);
    res.status(500).json({ message: '登录失败' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
});

export default router;
