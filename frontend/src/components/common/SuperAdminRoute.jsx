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
      console.error('❌ [SuperAdminRoute] Zugriff verweigert. Admin role:', admin.role);
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

