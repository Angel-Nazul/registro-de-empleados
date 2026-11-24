import { Navigate, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, type UserRole } from '../context/AuthContext';

interface ProtectedRouteProps {
  children?: ReactNode;
  /** Si se indican, solo estos roles pueden entrar. */
  roles?: UserRole[];
}

const homeFor = (role: UserRole): string => (role === 'ADMIN' ? '/dashboard' : '/mi-panel');

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }

  // Con children se usa directamente; sin children, sirve como layout route.
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
