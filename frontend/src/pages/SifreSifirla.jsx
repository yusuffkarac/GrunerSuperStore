import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiLock, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi';
import api from '../services/api';

function SifreSifirla() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // Token kontrolü
  useEffect(() => {
    if (!token) {
      toast.error('Ungültiger oder fehlender Zurücksetzungslink');
      navigate('/giris');
    }
  }, [token, navigate]);

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

    if (!formData.password) {
      newErrors.password = 'Passwort ist erforderlich';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Passwort muss mindestens 8 Zeichen lang sein';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Passwort muss Groß-, Kleinbuchstaben und Zahlen enthalten';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwortbestätigung ist erforderlich';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Şifre gücü kontrolü
  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, text: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) return { strength, text: 'Schwach', color: 'bg-red-500' };
    if (strength <= 3) return { strength, text: 'Mittel', color: 'bg-yellow-500' };
    return { strength, text: 'Stark', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength();

  // Şifre sıfırlama
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: formData.password,
      });

      setSuccess(true);
      toast.success('Passwort erfolgreich zurückgesetzt!');

      // 3 saniye sonra login sayfasına yönlendir
      setTimeout(() => {
        navigate('/giris');
      }, 3000);
    } catch (error) {
      console.error('Şifre sıfırlama hatası:', error);
      const errorMessage = error.response?.data?.message || 'Passwort konnte nicht zurückgesetzt werden. Der Link ist möglicherweise abgelaufen.';
      toast.error(errorMessage);
      setErrors({ general: errorMessage });
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
            {success ? (
              <FiCheck className="text-green-600 text-3xl" />
            ) : (
              <FiLock className="text-green-600 text-3xl" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {success ? 'Passwort zurückgesetzt!' : 'Neues Passwort festlegen'}
          </h1>
          <p className="text-gray-600">
            {success
              ? 'Sie werden zur Anmeldeseite weitergeleitet...'
              : 'Geben Sie Ihr neues Passwort ein'}
          </p>
        </div>

        {success ? (
          // Başarı mesajı
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-center">
                Ihr Passwort wurde erfolgreich zurückgesetzt!
              </p>
              <p className="text-green-700 text-sm text-center mt-2">
                Sie können sich jetzt mit Ihrem neuen Passwort anmelden.
              </p>
            </div>

            <Link
              to="/giris"
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Jetzt anmelden
            </Link>
          </div>
        ) : (
          // Şifre sıfırlama formu
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
            {/* Genel hata */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm text-center">{errors.general}</p>
              </div>
            )}

            {/* Yeni Şifre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Neues Passwort
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

              {/* Şifre gücü göstergesi */}
              {formData.password && !errors.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all`}
                        style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">{passwordStrength.text}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Mindestens 8 Zeichen, Groß- und Kleinbuchstaben, Zahlen
                  </p>
                </div>
              )}
            </div>

            {/* Şifre Tekrar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passwort bestätigen
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiLock />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    errors.confirmPassword
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-green-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Wird zurückgesetzt...' : 'Passwort zurücksetzen'}
            </button>

            {/* Geri Dön */}
            <div className="text-center">
              <Link
                to="/giris"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Zurück zur Anmeldung
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default SifreSifirla;
