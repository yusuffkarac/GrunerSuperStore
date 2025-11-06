import { FiInbox } from 'react-icons/fi';

// Empty State Componenti
function EmptyState({ icon: Icon = FiInbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-gray-400" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

      {message && <p className="text-gray-600 mb-4 max-w-sm">{message}</p>}

      {action && action}
    </div>
  );
}

export default EmptyState;
