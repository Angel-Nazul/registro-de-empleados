import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import TimeRecords from './pages/TimeRecords';
import Payroll from './pages/Payroll';
import MiPanel from './pages/MiPanel';
import MySalary from './pages/MySalary';
import Reports from './pages/Reports';

/** Redirección inicial según rol tras el login. */
const HomeRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'ADMIN' ? '/dashboard' : '/mi-panel'} replace />;
};

/** Evita mostrar el login a una sesión ya autenticada. */
const LoginRoute = () => {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'ADMIN' ? '/dashboard' : '/mi-panel'} replace />;
  }
  return <Login />;
};

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginRoute />} />

    <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />

    {/* Rutas de administrador */}
    <Route element={<ProtectedRoute roles={['ADMIN']} />}>
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/empleados" element={<Employees />} />
        <Route path="/horarios" element={<TimeRecords />} />
        <Route path="/nomina" element={<Payroll />} />
        <Route path="/reportes" element={<Reports />} />
      </Route>
    </Route>

    {/* Rutas de empleado */}
    <Route element={<ProtectedRoute roles={['EMPLEADO']} />}>
      <Route element={<Layout />}>
        <Route path="/mi-panel" element={<MiPanel />} />
        <Route path="/mis-registros" element={<TimeRecords />} />
        <Route path="/mi-salario" element={<MySalary />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
