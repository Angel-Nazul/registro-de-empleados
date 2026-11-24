import { Router } from 'express';
import {
  createTimeRecord,
  deleteTimeRecord,
  getTodayRecord,
  listTimeRecords,
  updateTimeRecord,
} from '../controllers/timeRecords.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

// Importante: /today antes que /:id (aunque aquí no haya GET /:id).
router.get('/today', getTodayRecord);
router.get('/', listTimeRecords);
router.post('/', createTimeRecord);
// El empleado puede corregir solo su registro de hoy; el borrado sigue siendo solo ADMIN.
router.put('/:id', authorize(Role.ADMIN, Role.EMPLEADO), updateTimeRecord);
router.delete('/:id', authorize(Role.ADMIN), deleteTimeRecord);

export default router;
