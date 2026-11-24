import { Router } from 'express';
import {
  exportAttendanceCsv,
  exportAttendanceExcel,
  getAttendance,
  getAttendanceSummary,
} from '../controllers/reports.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate, authorize(Role.ADMIN));

router.get('/attendance', getAttendance);
router.get('/attendance/summary', getAttendanceSummary);
router.get('/export/excel', exportAttendanceExcel);
router.get('/export/csv', exportAttendanceCsv);

export default router;
