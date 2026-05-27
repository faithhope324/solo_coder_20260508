import { Router, Request, Response } from 'express';
import { k8sClient } from '../clients/kubernetes';
import { ScaleRequest } from '../types';

const router = Router();

router.get('/pods', async (req: Request, res: Response) => {
  try {
    const namespace = (req.query.namespace as string) || 'default';
    const pods = await k8sClient.getPods(namespace);
    res.json(pods);
  } catch (error) {
    res.status(500).json({ error: '获取 Pod 列表失败' });
  }
});

router.get('/pods/metrics', async (req: Request, res: Response) => {
  try {
    const namespace = (req.query.namespace as string) || 'default';
    const metrics = await k8sClient.getPodMetrics(namespace);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: '获取 Pod 指标失败' });
  }
});

router.get('/deployments', async (req: Request, res: Response) => {
  try {
    const namespace = (req.query.namespace as string) || 'default';
    const deployments = await k8sClient.getDeployments(namespace);
    res.json(deployments);
  } catch (error) {
    res.status(500).json({ error: '获取 Deployment 列表失败' });
  }
});

router.post('/deployments/scale', async (req: Request, res: Response) => {
  try {
    const { namespace, name, replicas } = req.body as ScaleRequest;

    if (!name || replicas === undefined) {
      return res.status(400).json({ error: '缺少必要参数: name, replicas' });
    }

    if (replicas < 0 || replicas > 100) {
      return res.status(400).json({ error: '副本数必须在 0-100 之间' });
    }

    const result = await k8sClient.scaleDeployment(
      namespace || 'default',
      name,
      replicas
    );

    if (result) {
      res.json(result);
    } else {
      res.status(404).json({ error: 'Deployment 未找到' });
    }
  } catch (error) {
    res.status(500).json({ error: '扩缩容操作失败' });
  }
});

router.get('/health', (req: Request, res: Response) => {
  res.json({
    connected: k8sClient.isKubernetesConnected(),
    mode: k8sClient.isKubernetesConnected() ? 'kubernetes' : 'mock',
  });
});

export default router;
