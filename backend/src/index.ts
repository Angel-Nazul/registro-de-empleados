import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import authRoutes from './routes/auth.routes';
import employeesRoutes from './routes/employees.routes';
import timeRecordsRoutes from './routes/timeRecords.routes';
import payrollRoutes from './routes/payroll.routes';
import reportsRoutes from './routes/reports.routes';
import dashboardRoutes from './routes/dashboard.routes';
import meRoutes from './routes/me.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'API RRHH funcionando' });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/time-records', timeRecordsRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/me', meRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 4000);

app.listen(PORT, () => {
  console.log(`🚀 Backend RRHH escuchando en http://localhost:${PORT}`);
});
