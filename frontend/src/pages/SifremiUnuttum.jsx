import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiMail, FiArrowLeft, FiLock } from 'react-icons/fi';
import api from '../services/api';

function SifremiUnuttum() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  // Form validasyonu
  const validateEmail = (email) => {
    if (!email) {
      return 'E-Mail ist erforderlich';
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return 'Ungültige E-Mail-Adresse';
    }
    return '';
  };

  // Şifre sıfırlama isteği gönder
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email });
      setEmailSent(true);
      toast.success('Passwort-Zurücksetzungslink wurde an Ihre E-Mail gesendet!');
    } catch (error) {
      console.error('Şifre sıfırlama hatası:', error);
      const errorMessage = error.response?.data?.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
      setError(errorMessage);
      toast.error(errorMessage);
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
            <FiLock className="text-green-600 text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {emailSent ? 'E-Mail gesendet!' : 'Passwort vergessen?'}
          </h1>
          <p className="text-gray-600">
            {emailSent
              ? 'Überprüfen Sie Ihre E-Mail für den Zurücksetzungslink'
              : 'Geben Sie Ihre E-Mail-Adresse ein, um Ihr Passwort zurückzusetzen'}
          </p>
        </div>

        {emailSent ? (
          // Email gönderildikten sonra göster
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-center">
                Wir haben einen Link zum Zurücksetzen des Passworts an{' '}
                <strong>{email}</strong> gesendet.
              </p>
              <p className="text-green-700 text-sm text-center mt-2">
                Bitte überprüfen Sie auch Ihren Spam-Ordner.
              </p>
            </div>

            <div className="pt-4">
              <Link
                to="/anmelden"
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                <FiArrowLeft />
                Zurück zur Anmeldung
              </Link>
            </div>

            <div className="text-center text-sm text-gray-600">
              <button
                onClick={() => setEmailSent(false)}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                E-Mail nicht erhalten? Erneut senden
              </button>
            </div>
          </div>
        ) : (
          // Email gönderme formu
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
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="ihre@email.de"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    error
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-green-600'
                  }`}
                />
              </div>
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Wird gesendet...' : 'Zurücksetzungslink senden'}
            </button>

            {/* Geri Dön */}
            <div className="text-center">
              <Link
                to="/anmelden"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <FiArrowLeft />
                Zurück zur Anmeldung
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default SifremiUnuttum;
