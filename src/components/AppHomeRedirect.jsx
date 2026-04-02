import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultAppPathForUser } from '../utils/defaultAppRoute';

/** Redirect /app (index) theo role — không ép RoleDashboard khi role không dùng dashboard */
export default function AppHomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={getDefaultAppPathForUser(user)} replace />;
}
