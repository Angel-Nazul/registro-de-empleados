import { Router } from 'express';
import {
  getEmployeePayrollHistory,
  getWeekPayroll,
  updatePayroll,
} from '../controllers/payroll.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

router.get('/week/:weekStart', getWeekPayroll);
router.get('/employee/:employeeId/history', getEmployeePayrollHistory);
router.put('/:id', authorize(Role.ADMIN), updatePayroll);

export default router;
