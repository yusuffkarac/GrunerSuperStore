import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  // Geri sayım
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Countdown 0 olduğunda yönlendir
  useEffect(() => {
    if (countdown === 0) {
      navigate('/', { replace: true });
    }
  }, [countdown, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="text-center px-4 max-w-xl mx-auto">
        {/* 404 Animasyonlu Başlık */}
        <div className="mb-4">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-green-600 to-blue-600 mb-2">
            404
          </h1>
        </div>

        {/* İkon veya İllüstrasyon */}
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Başlık */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Seite nicht gefunden
        </h2>

        {/* Açıklama */}
        <p className="text-base text-gray-600 mb-6">
          Die angeforderte Seite konnte nicht gefunden werden.
        </p>

        {/* Geri Sayım */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-lg">
            <span className="text-sm text-gray-600">Weiterleitung in</span>
            <span className="text-xl font-bold text-green-600 w-6 text-center">
              {countdown}
            </span>
            <span className="text-sm text-gray-600">Sekunden</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-green-600 h-1.5 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${((5 - countdown) / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Startseite
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-white text-gray-700 font-semibold rounded-lg shadow-md hover:shadow-lg border-2 border-gray-300 hover:border-gray-400 transform hover:scale-105 transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Zurück
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;


