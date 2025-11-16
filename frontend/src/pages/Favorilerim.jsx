import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useFavoriteStore from '../store/favoriteStore';
import useAuthStore from '../store/authStore';
import campaignService from '../services/campaignService';
import UrunKarti from '../components/common/UrunKarti';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';

// Meine Favoriten Seite
function Favorilerim() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { favorites, loading, loadFavorites } = useFavoriteStore();
  const [campaigns, setCampaigns] = useState([]);

  // Kampagnen laden
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const response = await campaignService.getActiveCampaigns();
        setCampaigns(response.data.campaigns || []);
      } catch (error) {
        console.error('Fehler beim Laden der Kampagnen:', error);
      }
    };
    loadCampaigns();
  }, []);

  // Favoriten laden
  useEffect(() => {
    if (isAuthenticated) {
      loadFavorites();
    }
  }, [isAuthenticated, loadFavorites]);

  // Gültige Kampagne für Produkt finden
  const getCampaignForProduct = (product) => {
    if (!campaigns || campaigns.length === 0) return null;

    const applicableCampaigns = campaigns.filter((campaign) => {
      if (campaign.type === 'FREE_SHIPPING') return false;
      if (campaign.applyToAll) return true;
      if (product.categoryId && campaign.categoryIds) {
        const categoryIds = Array.isArray(campaign.categoryIds)
          ? campaign.categoryIds
          : [];
        if (categoryIds.includes(product.categoryId)) return true;
      }
      if (campaign.productIds) {
        const productIds = Array.isArray(campaign.productIds)
          ? campaign.productIds
          : [];
        if (productIds.includes(product.id)) return true;
      }
      return false;
    });

    return applicableCampaigns.length > 0 ? applicableCampaigns[0] : null;
  };

  // Wenn nicht angemeldet
  if (!isAuthenticated) {
    return (
      <div className="container-mobile py-8 pb-20">
        <EmptyState
          title="Anmelden"
          message="Sie müssen sich anmelden, um Ihre Favoriten zu sehen"
        />
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/anmelden')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Anmelden
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-mobile py-8 pb-20">
        <Loading />
      </div>
    );
  }

  const favoriteProducts = favorites.map((fav) => fav.product);

  return (
    <div className="pb-20 bg-white">
      <div className="container-mobile py-4">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Meine Favoriten</h1>

        {favoriteProducts.length === 0 ? (
          <EmptyState
            title="Sie haben noch keine Favoriten"
            message="Fügen Sie Produkte, die Ihnen gefallen, zu Ihren Favoriten hinzu"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favoriteProducts.map((product, index) => (
              <UrunKarti
                key={product.id}
                product={product}
                campaign={getCampaignForProduct(product)}
                priority={index < 6}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Favorilerim;
