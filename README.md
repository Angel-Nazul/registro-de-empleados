# NóminaMX - Sistema de Nómina

Sistema web completo para la gestión de empleados, horarios, asistencia y nómina semanal en México. Incluye dashboards con gráficas, reportes exportables a Excel/CSV y un panel del empleado con su información de Recursos Humanos.

## Stack

- **Backend:** Node.js + Express + TypeScript, Prisma 5 con SQLite, JWT, bcrypt, `xlsx-js-style` para Excel estilizado.
- **Frontend:** React + Vite + TypeScript, TailwindCSS, Recharts, react-hot-toast, lucide-react.
- **Base de datos:** SQLite local (`backend/prisma/dev.db`), sin servidor externo.
- **Zona horaria:** `America/Mexico_City`. Las fechas puras se guardan a medianoche UTC (`YYYY-MM-DD`).

## Requisitos

- Node.js **18+** (se recomienda 20 LTS) y npm 9+.
- No se necesita PostgreSQL ni MySQL.

## Instalación

### 1. Backend

```bash
cd backend
npm install
```

El archivo `.env` de desarrollo ya contiene:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="cambia-este-secreto-en-produccion"
PORT=4000
```

Prepara la base de datos y aplica el seed:

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

Inicia la API:

```bash
npm run dev
```

La API queda en `http://localhost:4000` (health check: `GET /api/health`).

### 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

La app queda en `http://localhost:5173`. Vite proxya `/api/*` hacia `http://localhost:4000`. Para apuntar a otro backend, crea `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:4000/api
```

## Credenciales de prueba

El seed crea 1 administrador y 3 empleados:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| ADMIN | `admin@empresa.mx` | `Admin123!` |
| EMPLEADO | `juan.perez@empresa.mx` | `Empleado123!` |
| EMPLEADO | `maria.lopez@empresa.mx` | `Empleado123!` |
| EMPLEADO | `carlos.ramirez@empresa.mx` | `Empleado123!` |

- ADMIN → `/dashboard`
- EMPLEADO → `/mi-panel`
- El seed no crea registros de horario ni nómina: el catálogo queda limpio para probar desde cero.

Tarifas de prueba: Juan **$95.00 MXN/h**, María **$110.00 MXN/h**, Carlos **$75.00 MXN/h**. Tarifa por defecto: **$80.00 MXN/h**. Referencia: salario mínimo **$278.80 MXN/día**.

Formato en toda la app: moneda `$1,234.56 MXN`, fechas `DD/MM/YYYY`, horas `HH:mm`.

## Módulos y roles

| Módulo | ADMIN | EMPLEADO |
| --- | --- | --- |
| `/dashboard` | ✅ Indicadores, gráficas, últimos registros y alertas | ❌ |
| Empleados | ✅ Alta, edición, baja lógica, filtros | ❌ |
| Registros de horarios | ✅ Altas, edición y eliminación | ✅ Altas propias y edición solo de su registro de hoy antes de las 23:59 |
| Nómina semanal | ✅ Cálculo, descuentos y tarifa override | ✅ Consulta de su semana e historial |
| `/reportes` | ✅ Filtros, tabla paginada y exportación | ❌ |
| `/mi-panel` | ❌ | ✅ Registro rápido + 4 pestañas de RH |

Las rutas protegidas redirigen a cada rol a su página de inicio. Un EMPLEADO recibe **403** si intenta llamar a cualquier endpoint ADMIN.

### Panel del empleado (`/mi-panel`)

- Saludo según la hora de México y 3 cards: horas de la semana, salario estimado y estado de hoy.
- Registro rápido: crea la jornada de hoy o permite corregirla antes de las 23:59.
- Últimos 5 registros de la semana.
- Pestañas: **Mi perfil**, **Mis registros**, **Mi salario**, **Resumen mensual**.
  - *Mis registros* admite un rango de fechas y muestra los totales del periodo.
  - *Resumen mensual* consulta `GET /api/me/summary?month=YYYY-MM` y muestra bruto, descuentos y neto.

### Dashboard ADMIN (`/dashboard`)

- Cards: empleados activos, horas de la semana, nómina semanal y empleados con retardos.
- Gráfica de líneas: horas trabajadas en los últimos 7 días (`hoursByDay`).
- Gráfica de barras: nómina neta por departamento (`payrollByDepartment`).
- Tabla de últimos registros y lista de alertas de retardos.

### Reportes (`/reportes`, solo ADMIN)

- Filtros: `from`, `to`, `employeeId`, `department`; por defecto semana actual (lunes a domingo).
- Tabla paginada a 20 filas con badge rojo **RETARDO** cuando `checkIn > 09:00`.
- Cards con totales de empleados, horas, horas extra y retardos.
- **Exportar Excel** (verde): archivo `asistencia_YYYY-MM-DD_a_YYYY-MM-DD.xlsx` con hojas **Asistencia** y **Resumen**, encabezados en negrita, columnas autofit y montos con formato `"$"#,##0.00" MXN"`.
- **Exportar CSV** (azul): separador coma y **BOM UTF-8** para que Excel respete acentos y símbolos.
- Ambas descargas muestran un toast con el nombre del archivo.

## Endpoints

Autenticación: enviar `Authorization: Bearer <token>`. El JWT expira en 8 horas. Errores centralizados: `{ "message": "..." }`.

### Auth

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | → `{ user }` |

### Empleados, horarios y nómina

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/api/employees?status=&department=&search=` | ADMIN | Catálogo filtrable |
| GET/POST | `/api/employees/:id` · `/api/employees` | ADMIN | Detalle y alta (con acceso opcional) |
| PUT/DELETE | `/api/employees/:id` | ADMIN | Edición y baja lógica (`INACTIVO`) |
| GET/POST | `/api/time-records` | Ambos | ADMIN ve todos; EMPLEADO solo los suyos |
| GET | `/api/time-records/today` | Ambos | Registro del día en hora México |
| PUT | `/api/time-records/:id` | ADMIN o propio | EMPLEADO solo su registro de hoy antes de las 23:59 |
| DELETE | `/api/time-records/:id` | ADMIN | Eliminación |
| GET | `/api/payroll/week/:weekStart` | ADMIN / propio | Nómina calculada (lunes `YYYY-MM-DD`) |
| PUT | `/api/payroll/:id` | ADMIN | Descuentos y tarifa override; recalcula la semana |
| GET | `/api/payroll/employee/:employeeId/history?weeks=8` | ADMIN / propio | Historial semanal persistido |

### Dashboards, reportes y panel RH

| Método | Ruta | Acceso | Respuesta principal |
| --- | --- | --- | --- |
| GET | `/api/dashboard/admin` | ADMIN | `activeEmployees`, `weeklyHours`, `weeklyPayroll`, `employeesWithTardiness`, `recentRecords`, `hoursByEmployee`, `payrollByDepartment`, `hoursByDay`, `weekStart` |
| GET | `/api/dashboard/employee` | EMPLEADO | `weeklyHours`, `weeklyEstimatedPay`, `lastRecords`, `todayStatus`, `employee`, `weekStart` |
| GET | `/api/reports/attendance?from=&to=&employeeId=&department=` | ADMIN | `{ rows, summary, filters }` |
| GET | `/api/reports/attendance/summary?...` | ADMIN | `{ summary, filters }` |
| GET | `/api/reports/export/excel?...` | ADMIN | Workbook `.xlsx` |
| GET | `/api/reports/export/csv?...` | ADMIN | CSV con BOM |
| GET | `/api/me/summary?month=YYYY-MM` | EMPLEADO | `profile`, `records`, `recordTotals`, `payrolls`, `monthly` |

Fila de asistencia: `{ employee, date, checkIn, lunchOut, lunchIn, checkOut, regularHours, overtimeHours, hasLunchIssue, hasTardiness, notes }`. El resumen agrupa por empleado con días, horas, retardos, descuentos y neto.

## Reglas de negocio

- Jornada regular de **8 horas/día**; horas extra pagadas al **1.5x**.
- Comida de **1 hora** dentro de **12:00–15:00**. Si se sale del rango o dura distinto, la jornada se guarda igual pero se añade la nota exacta `⚠ Comida fuera de 12:00–15:00 o duración distinta a 1 h` y un `warning` en la respuesta.
- Retardo cuando la entrada es posterior a las **09:00** (hora México).
- Un registro por empleado y fecha (`@@unique([employeeId, date])`).
- Semana laboral de **lunes a domingo**; la nómina se persiste con `upsert` en `WeeklyPayroll` y se recalcula al capturar o editar registros.
- Baja de empleados: lógica (`INACTIVO`), nunca eliminación física.
- Los descuentos manuales y el override de tarifa son exclusivos de ADMIN.
- Las consultas de resumen mensual no escriben en la BD; solo muestran el historial ya persistido.

## Estructura

```
backend/
  prisma/
    schema.prisma              # User, Employee, TimeRecord, WeeklyPayroll
    seed.ts                    # 1 admin + 3 empleados, sin registros
  src/
    routes/                    # auth, employees, time-records, payroll,
                               # reports, dashboard, me
    controllers/               # lógica HTTP de cada módulo
    utils/                     # datetime, timeRecords, payroll, reports,
                               # excel, week, formatters...
    middleware/                # auth, errorHandler
    types/                     # enums y tipos compartidos
frontend/
  src/
    api/                       # axios + clients (auth, employees, payroll,
                               # reports, dashboard, me)
    components/                # Layout, Sidebar, Badge, Skeleton, Tabs,
                               # Pagination, EmptyState, StatCard...
    context/                   # AuthContext
    pages/                     # Login, Dashboard, Employees, TimeRecords,
                               # Payroll, Reports, MiPanel...
    utils/                     # formatters, week, download, errors
  public/favicon.svg
```

## Comandos útiles

```bash
# Backend (desde backend/)
npm run dev              # servidor con recarga automática
npm run build            # chequeo de TypeScript (tsc --noEmit)
npx prisma migrate dev   # nueva migración
npx prisma db seed       # reaplicar datos de prueba
npx prisma studio        # explorar la BD

# Frontend (desde frontend/)
npm run dev              # servidor de desarrollo
npm run build            # tsc --noEmit + build de producción
```

## Verificación

- `npm run build` pasa sin errores en **backend** y **frontend**.
- Exportación Excel verificada: 2 hojas, encabezados negritos, autofit y formato MXN.
- Exportación CSV verificada: BOM UTF-8, acentos y `⚠`/`–` intactos.
- Flujos probados: login ADMIN/EMPLEADO, captura y edición de jornadas, cálculo de nómina, reportes filtrados, dashboards con datos reales y las 4 pestañas del panel del empleado.

## Notas técnicas

- SQLite/Prisma 5 no soporta `enum`: `role`, `contractType` y `status` se guardan como `String` y se validan en `backend/src/types/enums.ts`.
- Las fechas puras son llaves UTC `YYYY-MM-DD`; las horas se convierten explícitamente a `America/Mexico_City` para evitar desfases de horario de verano.
- Los reportes y exportaciones usan los mismos cálculos que la nómina, por lo que horas, retardos y descuentos siempre coinciden.
