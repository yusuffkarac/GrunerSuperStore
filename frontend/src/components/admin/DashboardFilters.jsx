import { useState, useEffect } from 'react';
import { FiFilter, FiX, FiCalendar } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { de } from 'date-fns/locale';

function DashboardFilters({ onFilterChange, categories = [] }) {
  const [timeRange, setTimeRange] = useState('30'); // 7, 30, 90, 365, custom
  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date());
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // İlk yüklemede varsayılan filtreleri uygula
    calculateDates(timeRange);
  }, []);

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    calculateDates(range);
  };

  const calculateDates = (range) => {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case '7':
        start.setDate(start.getDate() - 7);
        break;
      case '30':
        start.setDate(start.getDate() - 30);
        break;
      case '90':
        start.setDate(start.getDate() - 90);
        break;
      case '365':
        start.setDate(start.getDate() - 365);
        break;
      case 'custom':
        // Custom dates will be handled separately
        return;
      default:
        start.setDate(start.getDate() - 30);
    }

    if (range !== 'custom') {
      setCustomStartDate(start);
      setCustomEndDate(end);
      applyFilters(start, end, selectedCategory);
    }
  };

  const handleCustomDateChange = (start, end) => {
    if (start && end) {
      setCustomStartDate(start);
      setCustomEndDate(end);
      applyFilters(start, end, selectedCategory);
    }
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    applyFilters(customStartDate, customEndDate, categoryId);
  };

  const applyFilters = (start, end, category) => {
    if (!start || !end) return;

    const filters = {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      categoryId: category || undefined,
    };

    onFilterChange(filters);
  };

  const resetFilters = () => {
    setTimeRange('30');
    setSelectedCategory('');
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setCustomStartDate(start);
    setCustomEndDate(end);
    applyFilters(start, end, '');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
        >
          <FiFilter className="text-lg" />
          <span>Filter</span>
        </button>
        {(timeRange !== '30' || selectedCategory) && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <FiX className="text-sm" />
            <span>Zurücksetzen</span>
          </button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          {/* Zaman Aralığı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zeitraum
            </label>
            <div className="flex flex-wrap gap-2">
              {['7', '30', '90', '365'].map((days) => (
                <button
                  key={days}
                  onClick={() => handleTimeRangeChange(days)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    timeRange === days
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {days} Tage
                </button>
              ))}
              <button
                onClick={() => setTimeRange('custom')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                  timeRange === 'custom'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiCalendar className="text-xs" />
                Benutzerdefiniert
              </button>
            </div>
          </div>

          {/* Özel Tarih Aralığı */}
          {timeRange === 'custom' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Benutzerdefiniertes Datum
              </label>
              <div className="flex flex-wrap gap-2">
                <div className="flex-1 min-w-[150px]">
                  <DatePicker
                    selected={customStartDate}
                    onChange={(date) => {
                      setCustomStartDate(date);
                      if (date && customEndDate) {
                        handleCustomDateChange(date, customEndDate);
                      }
                    }}
                    selectsStart
                    startDate={customStartDate}
                    endDate={customEndDate}
                    locale={de}
                    dateFormat="dd.MM.yyyy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholderText="Von Datum"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <DatePicker
                    selected={customEndDate}
                    onChange={(date) => {
                      setCustomEndDate(date);
                      if (date && customStartDate) {
                        handleCustomDateChange(customStartDate, date);
                      }
                    }}
                    selectsEnd
                    startDate={customStartDate}
                    endDate={customEndDate}
                    minDate={customStartDate}
                    locale={de}
                    dateFormat="dd.MM.yyyy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholderText="Bis Datum"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Kategori Filtresi */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategorie
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Alle Kategorien</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardFilters;

