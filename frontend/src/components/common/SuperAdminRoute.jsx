import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function SuperAdminRoute({ children }) {
  const adminData = localStorage.getItem('admin');
  
  if (!adminData) {
    toast.error('Zugriff verweigert - Nur für Super-Administratoren');
    return <Navigate to="/admin/dashboard" replace />;
  }

  try {
    const admin = JSON.parse(adminData);
    
    // Role kontrolü (case-insensitive)
    const adminRole = admin.role?.toString().trim().toLowerCase();
    
    if (adminRole !== 'superadmin') {
      toast.error('Zugriff verweigert - Nur für Super-Administratoren');
      return <Navigate to="/admin/dashboard" replace />;
    }

    return children;
  } catch (error) {
    toast.error('Zugriff verweigert - Nur für Super-Administratoren');
    return <Navigate to="/admin/dashboard" replace />;
  }
}

export default SuperAdminRoute;

