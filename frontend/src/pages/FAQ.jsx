import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiHelpCircle, FiSearch, FiTag } from 'react-icons/fi';
import { toast } from 'react-toastify';
import faqService from '../services/faqService';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';

function FAQ() {
  const [faqs, setFaqs] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openItems, setOpenItems] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    setLoading(true);
    try {
      const faqData = await faqService.getActiveFAQs();
      // Service zaten doğru formatı döndürüyor: { faqs, grouped, categories }
      setFaqs(faqData.faqs || []);
      setGrouped(faqData.grouped || {});
      setCategories(faqData.categories || []);
    } catch (error) {
      toast.error('FAQ konnte nicht geladen werden');
      console.error('FAQ yükleme hatası:', error);
      console.error('Error response:', error.response);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getFilteredFAQs = () => {
    if (selectedCategory === 'all') {
      return faqs;
    }
    return faqs.filter((faq) => (faq.category || 'Allgemein') === selectedCategory);
  };

  if (loading) {
    return <Loading />;
  }

  if (faqs.length === 0) {
    return (
      <div className="container-mobile py-8">
        <EmptyState
          icon={FiHelpCircle}
          title="Keine FAQ verfügbar"
          message="Derzeit sind keine häufig gestellten Fragen verfügbar."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container-mobile py-8 md:py-12">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 mb-4 shadow-md">
            <FiHelpCircle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Häufig gestellte Fragen
          </h1>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            Finden Sie schnell Antworten auf die häufigsten Fragen zu unseren Produkten und Services.
          </p>
        </motion.div>

        {/* Kategoriler */}
        {categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <FiTag className="w-5 h-5 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Kategorien
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-5 py-2.5 rounded-full font-medium transition-all duration-200 shadow-sm ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-primary-300 hover:shadow-md'
                }`}
              >
                Alle ({faqs.length})
              </button>
              {categories.map((category) => {
                const categoryCount = faqs.filter(
                  (faq) => (faq.category || 'Allgemein') === category
                ).length;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-5 py-2.5 rounded-full font-medium transition-all duration-200 shadow-sm ${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md transform scale-105'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-primary-300 hover:shadow-md'
                    }`}
                  >
                    {category} ({categoryCount})
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* FAQ Liste */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {getFilteredFAQs().length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200"
              >
                <FiSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Keine FAQ in dieser Kategorie gefunden.</p>
              </motion.div>
            ) : (
              getFilteredFAQs().map((faq, index) => (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200"
                >
                  <button
                    onClick={() => toggleItem(faq.id)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gradient-to-r hover:from-primary-50 hover:to-transparent transition-all duration-200 group"
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          openItems[faq.id]
                            ? 'bg-primary-100 text-primary-600'
                            : 'bg-gray-100 text-gray-400 group-hover:bg-primary-100 group-hover:text-primary-600'
                        }`}>
                          <span className="text-xs font-bold">
                            {String.fromCharCode(65 + index)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1 group-hover:text-primary-700 transition-colors">
                            {faq.question}
                          </h3>
                          {faq.category && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <FiTag className="w-3 h-3" />
                              {faq.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                        openItems[faq.id]
                          ? 'bg-primary-100 text-primary-600 rotate-180'
                          : 'bg-gray-100 text-gray-400 group-hover:bg-primary-100 group-hover:text-primary-600'
                      }`}>
                        <FiChevronDown className="w-5 h-5" />
                      </div>
                    </div>
                  </button>
                  <AnimatePresence>
                    {openItems[faq.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 pt-2 border-t border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                          <div className="pl-9">
                            <div
                              className="text-gray-700 prose prose-sm max-w-none leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: faq.answer }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Help Section */}
        {getFilteredFAQs().length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 p-6 bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl border border-primary-200"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center">
                <FiHelpCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Weitere Hilfe benötigt?</h3>
                <p className="text-sm text-gray-600">
                  Falls Sie Ihre Frage hier nicht finden konnten, kontaktieren Sie uns gerne über unser Support-System.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default FAQ;

