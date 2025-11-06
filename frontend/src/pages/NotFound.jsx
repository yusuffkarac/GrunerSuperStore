import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">404</h1>
        <p className="text-gray-600 mb-6">Sayfa bulunamadı</p>
        <Link to="/" className="text-green-700 underline">Ana sayfaya dön</Link>
      </div>
    </div>
  );
}

export default NotFound;


