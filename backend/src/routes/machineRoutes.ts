import { Router } from 'express';
import { getMachines } from '../controllers/machineController';
import requirePermission from '../middleware/requirePermission';

const router = Router();

router.get('/', requirePermission('machine:view'), getMachines);

export default router;
