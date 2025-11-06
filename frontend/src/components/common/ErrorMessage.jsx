import { FiAlertCircle } from 'react-icons/fi';

// Error Message Componenti
function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <FiAlertCircle className="w-8 h-8 text-red-600" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Ein Fehler ist aufgetreten
      </h3>

      <p className="text-gray-600 text-center mb-4">
        {message || 'Etwas ist schief gelaufen. Bitte versuchen Sie es erneut.'}
      </p>

      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Erneut versuchen
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
