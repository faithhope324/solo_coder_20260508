import { Router } from 'express';
import { auditLogController } from '../controllers/auditLogController';

const router = Router();

router.get('/', auditLogController.getLogs);

export { router as auditLogRoutes };
