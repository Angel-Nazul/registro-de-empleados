import { Router } from 'express';
import { getMySummary } from '../controllers/me.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate, authorize(Role.EMPLEADO));

router.get('/summary', getMySummary);

export default router;
