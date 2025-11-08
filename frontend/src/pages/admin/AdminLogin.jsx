import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiEye, FiEyeOff, FiShield } from 'react-icons/fi';
import authService from '../../services/authService';
import { BARCODE_ONLY_MODE } from '../../config/appConfig';

function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Zaten giriş yapmışsa yönlendir
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      // Barkod-only modunda barkod sayfasına, değilse dashboard'a yönlendir
      navigate(BARCODE_ONLY_MODE ? '/admin/barcode-labels' : '/admin/dashboard');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'E-Mail ist erforderlich';
    }
    if (!formData.password) {
      newErrors.password = 'Passwort ist erforderlich';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Admin login endpoint'ini çağır
      const response = await authService.adminLogin(formData);
      console.log('🔍 Full Admin login response:', response);

      // api.js'deki interceptor response.data return ediyor
      // Bu yüzden response zaten { success, message, data: { admin, token } } yapısında
      const { token, admin } = response.data || response;

      console.log('🔑 Extracted token:', token);
      console.log('👤 Extracted admin:', admin);

      if (token && admin) {
        localStorage.setItem('adminToken', token);
        localStorage.setItem('admin', JSON.stringify(admin));
       
        toast.success('Admin-Anmeldung erfolgreich!');

        // Navigate öncesi kısa bir gecikme
        setTimeout(() => {
          // Barkod-only modunda barkod sayfasına, değilse dashboard'a yönlendir
          navigate(BARCODE_ONLY_MODE ? '/admin/barcode-labels' : '/admin/dashboard');
        }, 100);
      } else {
        console.error('❌ Token veya admin bulunamadı');
        console.error('❌ Response yapısı:', response);
        throw new Error('Token oder Admin-Daten fehlen');
      }
    } catch (error) {
      console.error('❌ Admin login error:', error);
      console.error('❌ Error response:', error.response);
      toast.error(error.response?.data?.message || 'Anmeldung fehlgeschlagen. Ungültige Anmeldedaten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-600 rounded-full flex items-center justify-center">
            <FiShield className="text-white text-3xl" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin-Portal</h1>
          <p className="text-gray-600">Melden Sie sich an, um fortzufahren</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FiMail />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-green-600'
                }`}
              />
            </div>
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Passwort</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FiLock />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.password
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-green-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Wird angemeldet...' : 'Anmelden'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default AdminLogin;
