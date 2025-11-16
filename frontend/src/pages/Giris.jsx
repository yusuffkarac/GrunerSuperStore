import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiEye, FiEyeOff, FiShoppingBag } from 'react-icons/fi';
import useAuthStore from '../store/authStore';

function Giris() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Form değişikliği
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Hata temizle
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Form validasyonu
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
    }

    if (!formData.password) {
      newErrors.password = 'Passwort ist erforderlich';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Passwort muss mindestens 6 Zeichen lang sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Giriş yap
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await login(formData.email, formData.password);
      toast.success('Erfolgreich angemeldet!');

      // Önceden gitmek istediği sayfa varsa oraya yönlendir
      const from = location.state?.from || '/';
      navigate(from);
    } catch (error) {
      console.error('Giriş hatası:', error);
      toast.error(
        error.response?.data?.message || 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-mobile min-h-[80vh] flex items-center justify-center py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo/Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <FiShoppingBag className="text-green-600 text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Willkommen zurück</h1>
          <p className="text-gray-600">Melden Sie sich an, um fortzufahren</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
          {/* Email */}
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
                placeholder="ihre@email.de"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-green-600'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Şifre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
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
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Şifremi Unuttum */}
          <div className="text-right">
            <Link
              to="/passwort-vergessen"
              className="text-sm text-green-600 hover:text-green-700"
            >
              Passwort vergessen?
            </Link>
          </div>

          {/* Giriş Butonu */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Wird angemeldet...' : 'Anmelden'}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">oder</span>
            </div>
          </div>

          {/* Kayıt Ol Linki */}
          <div className="text-center">
            <p className="text-gray-600">
              Noch kein Konto?{' '}
              <Link
                to="/registrieren"
                className="text-green-600 font-medium hover:text-green-700"
              >
                Jetzt registrieren
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default Giris;
