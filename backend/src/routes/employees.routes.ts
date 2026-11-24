import { Router } from 'express';
import {
  createEmployee,
  deactivateEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
} from '../controllers/employees.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

// Módulo de administración de personal: solo ADMIN.
router.use(authenticate, authorize(Role.ADMIN));

router.get('/', listEmployees);
router.get('/:id', getEmployee);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deactivateEmployee);

export default router;
