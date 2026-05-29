import { Router } from 'express';
import { tenantController } from '../controllers/tenantController';

const router = Router();

router.get('/', tenantController.getTenants);
router.get('/:id', tenantController.getTenantById);
router.put('/:id/quota', tenantController.updateQuota);

export { router as tenantRoutes };
