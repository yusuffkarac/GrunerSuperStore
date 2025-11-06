import { FiInbox } from 'react-icons/fi';

// Empty State Componenti
function EmptyState({ icon: Icon = FiInbox, title, message, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-gray-400" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

      {(message || description) && (
        <p className="text-gray-600 mb-4 max-w-sm">{message || description}</p>
      )}

      {action && (
        typeof action === 'object' && action.label && action.onClick ? (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            {action.label}
          </button>
        ) : (
          action
        )
      )}
    </div>
  );
}

export default EmptyState;
