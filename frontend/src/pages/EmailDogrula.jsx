import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiMail, FiRefreshCw, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import authService from '../services/authService';
import useAuthStore from '../store/authStore';

function EmailDogrula() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Email'i URL'den al (searchParams.get zaten decode ediyor)
  // Eğer decode edilmemişse manuel decode et
  const emailParam = searchParams.get('email') || '';
  const email = emailParam.includes('%') ? decodeURIComponent(emailParam) : emailParam;
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  // Debug: Email'i kontrol et
  useEffect(() => {
    if (email) {
      console.log('📧 [EmailDogrula] Email alındı:', email);
      console.log('📧 [EmailDogrula] Email parametresi (raw):', emailParam);
      console.log('📧 [EmailDogrula] Email uzunluğu:', email.length);
      console.log('📧 [EmailDogrula] Email nokta içeriyor mu:', email.includes('.'));
      console.log('📧 [EmailDogrula] URL:', window.location.href);
    } else {
      console.warn('⚠️ [EmailDogrula] Email bulunamadı!');
      console.warn('⚠️ [EmailDogrula] URL:', window.location.href);
    }
  }, [email, emailParam]);

  // Kod input'ları için state
  const [codeInputs, setCodeInputs] = useState(['', '', '', '', '', '']);

  // Kod input değişikliği
  const handleCodeChange = (index, value) => {
    // Sadece rakam kabul et
    if (value && !/^\d$/.test(value)) return;

    const newInputs = [...codeInputs];
    newInputs[index] = value;
    setCodeInputs(newInputs);

    // Otomatik olarak bir sonraki input'a geç
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    // Tüm kodları birleştir
    const fullCode = newInputs.join('');
    setVerificationCode(fullCode);

    // 6 haneli kod tamamlandıysa otomatik doğrula
    if (fullCode.length === 6) {
      handleVerify(fullCode);
    }
  };

  // Geri tuşu ile önceki input'a geç
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !codeInputs[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Email doğrulama
  const handleVerify = async (code = verificationCode) => {
    if (!email) {
      toast.error('E-Mail-Adresse fehlt');
      navigate('/kayit');
      return;
    }

    if (!code || code.length !== 6) {
      toast.error('Bitte geben Sie den 6-stelligen Code ein');
      return;
    }

    setLoading(true);

    try {
      // Email'i normalize et (trim ve lowercase) - nokta karakterini koru
      // NOT: toLowerCase() ve trim() noktayı kaldırmaz, sadece boşlukları temizler
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log('🔍 [EmailDogrula] Doğrulama isteği:', { 
        originalEmail: email, 
        normalizedEmail, 
        code,
        emailLength: email.length,
        normalizedLength: normalizedEmail.length,
        hasDot: email.includes('.'),
        normalizedHasDot: normalizedEmail.includes('.')
      });
      
      const response = await authService.verifyEmail({ 
        email: normalizedEmail, 
        code 
      });
      
      // API interceptor response.data'yı döndürüyor
      // Backend: { success: true, message: "...", data: { user, token } }
      // Interceptor sonrası: { success: true, message: "...", data: { user, token } }
      console.log('✅ Email doğrulama response:', response);
      
      if (response?.data?.token) {
        const token = response.data.token;
        const user = response.data.user;
        
        // Token'ı kaydet (authService zaten kaydediyor ama emin olmak için)
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Auth store'u güncelle
        useAuthStore.setState({
          user: user,
          token: token,
          isAuthenticated: true,
        });
        
        setIsVerified(true);
        toast.success('E-Mail erfolgreich bestätigt!');
        
        // Login sayfasına yönlendir
        navigate('/giris');
      } else {
        console.error('❌ Token bulunamadı:', response);
        throw new Error('Token nicht erhalten');
      }
    } catch (error) {
      console.error('Doğrulama hatası:', error);
      toast.error(
        error.response?.data?.message || 'Ungültiger Bestätigungscode. Bitte versuchen Sie es erneut.'
      );
      // Hata durumunda input'ları temizle
      setCodeInputs(['', '', '', '', '', '']);
      setVerificationCode('');
      document.getElementById('code-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Doğrulama kodunu yeniden gönder
  const handleResend = async () => {
    if (!email) {
      toast.error('E-Mail-Adresse fehlt');
      navigate('/kayit');
      return;
    }

    setResending(true);

    try {
      // Email'i normalize et
      const normalizedEmail = email.toLowerCase().trim();
      await authService.resendVerification(normalizedEmail);
      toast.success('Bestätigungscode wurde erneut gesendet');
    } catch (error) {
      console.error('Yeniden gönderme hatası:', error);
      toast.error(
        error.response?.data?.message || 'Fehler beim erneuten Senden des Codes. Bitte versuchen Sie es erneut.'
      );
    } finally {
      setResending(false);
    }
  };

  // Sayfa yüklendiğinde ilk input'a focus
  useEffect(() => {
    if (!email) {
      toast.error('E-Mail-Adresse fehlt');
      navigate('/kayit');
      return;
    }
    document.getElementById('code-0')?.focus();
  }, [email, navigate]);

  if (isVerified) {
    return (
      <div className="container-mobile min-h-[80vh] flex items-center justify-center py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <FiCheckCircle className="text-green-600 text-4xl" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              E-Mail erfolgreich bestätigt!
            </h1>
            <p className="text-gray-600 mb-6">
              Sie werden gleich weitergeleitet...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

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
            <FiMail className="text-green-600 text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            E-Mail bestätigen
          </h1>
          <p className="text-gray-600">
            Wir haben einen Bestätigungscode an{' '}
            <span className="font-medium text-gray-900">{email}</span> gesendet
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          {/* Kod Input'ları */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
              Geben Sie den 6-stelligen Code ein
            </label>
            <div className="flex justify-center gap-2">
              {codeInputs.map((value, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all"
                />
              ))}
            </div>
          </div>

          {/* Doğrula Butonu */}
          <button
            onClick={() => handleVerify()}
            disabled={loading || verificationCode.length !== 6}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Wird überprüft...' : 'Bestätigen'}
          </button>

          {/* Yeniden Gönder */}
          <div className="text-center">
            <p className="text-gray-600 mb-2">Code nicht erhalten?</p>
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-green-600 font-medium hover:text-green-700 flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
            >
              <FiRefreshCw className={resending ? 'animate-spin' : ''} />
              {resending ? 'Wird gesendet...' : 'Code erneut senden'}
            </button>
          </div>

          {/* Geri Dön */}
          <div className="pt-4 border-t border-gray-200">
            <Link
              to="/kayit"
              className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <FiArrowLeft />
              Zurück zur Registrierung
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default EmailDogrula;

