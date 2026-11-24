import { Router } from 'express';
import {
  getAdminDashboard,
  getEmployeeDashboard,
} from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

router.get('/admin', authorize(Role.ADMIN), getAdminDashboard);
router.get('/employee', authorize(Role.EMPLEADO), getEmployeeDashboard);

export default router;
