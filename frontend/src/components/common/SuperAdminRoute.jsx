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
    
    if (admin.role !== 'superadmin') {
      toast.error('Zugriff verweigert - Nur für Super-Administratoren');
      return <Navigate to="/admin/dashboard" replace />;
    }

    return children;
  } catch (error) {
    console.error('Error parsing admin data:', error);
    toast.error('Zugriff verweigert - Nur für Super-Administratoren');
    return <Navigate to="/admin/dashboard" replace />;
  }
}

export default SuperAdminRoute;

