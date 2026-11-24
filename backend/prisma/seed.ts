import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ContractType, EmployeeStatus, Role } from '../src/types/enums';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  // Seed idempotente: se limpia en orden inverso por las llaves foráneas.
  await prisma.weeklyPayroll.deleteMany();
  await prisma.timeRecord.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();

  // --- Administrador (sin expediente de empleado) ---
  await prisma.user.create({
    data: {
      email: 'admin@empresa.mx',
      password: await bcrypt.hash('Admin123!', SALT_ROUNDS),
      role: Role.ADMIN,
    },
  });

  // --- Empleados de prueba (sin registros de horario ni nómina todavía) ---
  const employees = [
    {
      fullName: 'Juan Pérez García',
      email: 'juan.perez@empresa.mx',
      password: 'Empleado123!',
      phone: '55 1234 5678',
      position: 'Desarrollador',
      department: 'Sistemas',
      hireDate: new Date('2024-01-15T12:00:00Z'),
      hourlyRate: 95.0,
      contractType: ContractType.TIEMPO_COMPLETO,
      status: EmployeeStatus.ACTIVO,
    },
    {
      fullName: 'María López Hernández',
      email: 'maria.lopez@empresa.mx',
      password: 'Empleado123!',
      phone: '55 2345 6789',
      position: 'Contadora',
      department: 'Finanzas',
      hireDate: new Date('2023-08-01T12:00:00Z'),
      hourlyRate: 110.0,
      contractType: ContractType.TIEMPO_COMPLETO,
      status: EmployeeStatus.ACTIVO,
    },
    {
      fullName: 'Carlos Ramírez Torres',
      email: 'carlos.ramirez@empresa.mx',
      password: 'Empleado123!',
      phone: '55 3456 7890',
      position: 'Auxiliar administrativo',
      department: 'Recursos Humanos',
      hireDate: new Date('2024-06-10T12:00:00Z'),
      hourlyRate: 75.0,
      contractType: ContractType.MEDIO_TIEMPO,
      status: EmployeeStatus.ACTIVO,
    },
  ];

  for (const employee of employees) {
    // 1) Empleado, 2) User con employeeId, 3) enlace inverso userId.
    const created = await prisma.employee.create({
      data: {
        fullName: employee.fullName,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        department: employee.department,
        hireDate: employee.hireDate,
        hourlyRate: employee.hourlyRate,
        contractType: employee.contractType,
        status: employee.status,
      },
    });

    const user = await prisma.user.create({
      data: {
        email: employee.email,
        password: await bcrypt.hash(employee.password, SALT_ROUNDS),
        role: Role.EMPLEADO,
        employeeId: created.id,
      },
    });

    await prisma.employee.update({
      where: { id: created.id },
      data: { userId: user.id },
    });
  }

  console.log('✅ Seed aplicado: 1 administrador y 3 empleados.');
}

main()
  .catch((error) => {
    console.error('❌ Error al aplicar el seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
