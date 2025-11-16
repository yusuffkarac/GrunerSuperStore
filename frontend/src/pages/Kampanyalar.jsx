import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTag, FiCalendar, FiPercent, FiDollarSign, FiShoppingBag, FiTruck, FiChevronRight, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import campaignService from '../services/campaignService';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import { normalizeImageUrl } from '../utils/imageUtils';

function Kampanyalar() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (selectedType) {
      setFilteredCampaigns(
        campaigns.filter((campaign) => campaign.type === selectedType)
      );
    } else {
      setFilteredCampaigns(campaigns);
    }
  }, [selectedType, campaigns]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const response = await campaignService.getActiveCampaigns();
      setCampaigns(response.data.campaigns || []);
      setFilteredCampaigns(response.data.campaigns || []);
    } catch (error) {
      toast.error('Kampagnen konnten nicht geladen werden');
      console.error('Kampanya yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Kampanya tipi label
  const getCampaignTypeLabel = (type) => {
    const labels = {
      PERCENTAGE: 'Prozentrabatt',
      FIXED_AMOUNT: 'Fester Betrag',
      BUY_X_GET_Y: 'X kaufen Y zahlen',
      FREE_SHIPPING: 'Kostenloser Versand',
    };
    return labels[type] || type;
  };

  // Kampanya tipi ikonu
  const getCampaignTypeIcon = (type) => {
    switch (type) {
      case 'PERCENTAGE':
        return <FiPercent className="w-5 h-5" />;
      case 'FIXED_AMOUNT':
        return <FiDollarSign className="w-5 h-5" />;
      case 'BUY_X_GET_Y':
        return <FiShoppingBag className="w-5 h-5" />;
      case 'FREE_SHIPPING':
        return <FiTruck className="w-5 h-5" />;
      default:
        return <FiTag className="w-5 h-5" />;
    }
  };

  // Kampanya badge metni
  const getCampaignBadge = (campaign) => {
    switch (campaign.type) {
      case 'PERCENTAGE':
        return `%${campaign.discountPercent} Rabatt`;
      case 'FIXED_AMOUNT':
        return `€${campaign.discountAmount} Rabatt`;
      case 'BUY_X_GET_Y':
        return `${campaign.buyQuantity} kaufen ${campaign.getQuantity} zahlen`;
      case 'FREE_SHIPPING':
        return 'Kostenloser Versand';
      default:
        return 'Kampagne';
    }
  };

  // Tarih kontrolü
  const isExpiringSoon = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft > 0;
  };

  // Kalan gün sayısı
  const getDaysLeft = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  if (loading) {
    return <Loading />;
  }

  // Header için ilk kampanyanın görselini kullan veya degrade
  const headerImageUrl = campaigns.length > 0 && campaigns[0].imageUrl 
    ? normalizeImageUrl(campaigns[0].imageUrl) 
    : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div 
        className={`relative text-white py-8 md:py-12 px-4 overflow-hidden ${
          headerImageUrl ? '' : 'bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800'
        }`}
        style={headerImageUrl ? {
          backgroundImage: `url(${headerImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : {}}
      >
        {/* Overlay - Metnin okunabilirliği için */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/50 to-black/40"></div>
        
        <div className="container-mobile relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-lg">Aktuelle Kampagnen</h1>
          <p className="text-white/95 text-lg drop-shadow-md">
            Entdecken Sie unsere aktuellen Angebote und sparen Sie Geld
          </p>
        </div>
      </div>

      <div className="container-mobile py-6">
        {/* Filter */}
        {campaigns.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedType('')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedType === ''
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setSelectedType('PERCENTAGE')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                selectedType === 'PERCENTAGE'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FiPercent className="w-4 h-4" />
              Prozentrabatt
            </button>
            <button
              onClick={() => setSelectedType('FIXED_AMOUNT')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                selectedType === 'FIXED_AMOUNT'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FiDollarSign className="w-4 h-4" />
              Fester Betrag
            </button>
            <button
              onClick={() => setSelectedType('BUY_X_GET_Y')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                selectedType === 'BUY_X_GET_Y'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FiShoppingBag className="w-4 h-4" />
              X kaufen Y zahlen
            </button>
            <button
              onClick={() => setSelectedType('FREE_SHIPPING')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                selectedType === 'FREE_SHIPPING'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FiTruck className="w-4 h-4" />
              Kostenloser Versand
            </button>
          </div>
        )}

        {/* Kampanyalar Listesi */}
        {filteredCampaigns.length === 0 ? (
          <EmptyState
            icon={FiTag}
            title="Keine Kampagnen gefunden"
            description={
              selectedType
                ? 'Es gibt keine Kampagnen dieses Typs'
                : 'Derzeit sind keine aktiven Kampagnen verfügbar'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredCampaigns.map((campaign, index) => {
                const daysLeft = getDaysLeft(campaign.endDate);
                const expiringSoon = isExpiringSoon(campaign.endDate);

                return (
                  <motion.div
                    key={campaign.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col h-full"
                  >
                    {/* Kampanya Görseli */}
                    {campaign.imageUrl ? (
                      <div className="relative h-48 bg-gray-200 overflow-hidden">
                        <img
                          src={campaign.imageUrl}
                          alt={campaign.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading={index < 6 ? "eager" : "lazy"}
                        />
                        {/* Badge */}
                        <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg flex items-center gap-1">
                          {getCampaignTypeIcon(campaign.type)}
                          <span>{getCampaignBadge(campaign)}</span>
                        </div>
                        {/* Yakında bitiyor badge */}
                        {expiringSoon && (
                          <div className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
                            <FiClock className="w-3 h-3" />
                            <span>Bald endet</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative h-48 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                        <div className="text-white text-center">
                          {getCampaignTypeIcon(campaign.type)}
                          <div className="mt-2 text-sm font-semibold">
                            {getCampaignTypeLabel(campaign.type)}
                          </div>
                        </div>
                        {/* Badge */}
                        <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg flex items-center gap-1">
                          {getCampaignTypeIcon(campaign.type)}
                          <span>{getCampaignBadge(campaign)}</span>
                        </div>
                        {/* Yakında bitiyor badge */}
                        {expiringSoon && (
                          <div className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
                            <FiClock className="w-3 h-3" />
                            <span>Bald endet</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="px-5 pt-5 pb-5 flex flex-col flex-1">
                      {/* Başlık */}
                      <h3 className="font-bold text-xl text-gray-900 mb-2">
                        {campaign.name}
                      </h3>

                      {/* Açıklama */}
                      {campaign.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {campaign.description}
                        </p>
                      )}

                      {/* Detaylar */}
                      <div className="space-y-2 mb-4 flex-1">
                        {/* Tarih */}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiCalendar className="w-4 h-4" />
                          <span>
                            {new Date(campaign.startDate).toLocaleDateString('de-DE')} -{' '}
                            {new Date(campaign.endDate).toLocaleDateString('de-DE')}
                          </span>
                        </div>

                        {/* Kalan gün */}
                        {daysLeft > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            {expiringSoon ? (
                              <span className="text-orange-600 font-semibold flex items-center gap-1">
                                <FiClock className="w-4 h-4" />
                                Noch {daysLeft} {daysLeft === 1 ? 'Tag' : 'Tage'}
                              </span>
                            ) : (
                              <span className="text-gray-600">
                                Noch {daysLeft} {daysLeft === 1 ? 'Tag' : 'Tage'}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Koşullar */}
                        {campaign.minPurchase && (
                          <div className="text-xs text-gray-500">
                            Mindestbestellwert: €{parseFloat(campaign.minPurchase).toFixed(2)}
                          </div>
                        )}

                        {campaign.maxDiscount && campaign.type === 'PERCENTAGE' && (
                          <div className="text-xs text-gray-500">
                            Max. Rabatt: €{parseFloat(campaign.maxDiscount).toFixed(2)}
                          </div>
                        )}

                        {campaign.usageLimit && (
                          <div className="text-xs text-gray-500">
                            Nutzungslimit: {campaign.usageLimit}x
                          </div>
                        )}
                      </div>

                      {/* Ürünlere git butonu */}
                      <Link
                        to={`/produkte?campaign=${campaign.id}`}
                        className="w-full mt-4 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <span>Jetzt einkaufen</span>
                        <FiChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

export default Kampanyalar;

