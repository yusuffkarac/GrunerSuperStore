/**
 * İndirim Hesaplama Utility
 *
 * Kampanyaların ürün ve sepet üzerindeki etkisini hesaplar
 */

class DiscountCalculator {
  /**
   * Tek bir ürün için indirim hesapla
   * @param {Object} params
   * @param {number} params.price - Ürün fiyatı
   * @param {number} params.quantity - Ürün adedi
   * @param {Array} params.campaigns - Geçerli kampanyalar
   * @returns {Object} { discountedPrice, originalPrice, discount, appliedCampaign }
   */
  calculateProductDiscount({ price, quantity = 1, campaigns = [] }) {
    if (!campaigns || campaigns.length === 0) {
      return {
        discountedPrice: parseFloat(price),
        originalPrice: parseFloat(price),
        discount: 0,
        appliedCampaign: null,
      };
    }

    let bestDiscount = 0;
    let bestCampaign = null;

    // Her kampanya için indirimi hesapla ve en iyisini seç
    for (const campaign of campaigns) {
      const discount = this._calculateSingleCampaignDiscount({
        price,
        quantity,
        campaign,
      });

      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestCampaign = campaign;
      }
    }

    const originalPrice = parseFloat(price);
    const discountedPrice = Math.max(0, originalPrice - bestDiscount);

    return {
      discountedPrice: parseFloat(discountedPrice.toFixed(2)),
      originalPrice,
      discount: parseFloat(bestDiscount.toFixed(2)),
      appliedCampaign: bestCampaign,
    };
  }

  /**
   * Sepet için toplam indirim hesapla
   * @param {Object} params
   * @param {Array} params.items - Sepet ürünleri
   * @param {Array} params.campaigns - Geçerli kampanyalar
   * @returns {Object} { items, subtotal, totalDiscount, discountedSubtotal, appliedCampaigns }
   */
  calculateCartDiscount({ items, campaigns = [] }) {
    if (!items || items.length === 0) {
      return {
        items: [],
        subtotal: 0,
        totalDiscount: 0,
        discountedSubtotal: 0,
        appliedCampaigns: [],
      };
    }

    let subtotal = 0;
    let totalDiscount = 0;
    const appliedCampaignsMap = new Map();
    const processedItems = [];

    // Her ürün için indirimi hesapla
    for (const item of items) {
      const itemPrice = parseFloat(item.price);
      const quantity = parseInt(item.quantity);

      // Ürün için geçerli kampanyaları filtrele
      const applicableCampaigns = this._filterApplicableCampaigns({
        productId: item.productId,
        categoryId: item.categoryId,
        campaigns,
      });

      // İndirimi hesapla
      const result = this.calculateProductDiscount({
        price: itemPrice,
        quantity,
        campaigns: applicableCampaigns,
      });

      const itemTotal = itemPrice * quantity;
      const itemDiscountedTotal = result.discountedPrice * quantity;
      const itemDiscount = itemTotal - itemDiscountedTotal;

      subtotal += itemTotal;
      totalDiscount += itemDiscount;

      // Kampanyayı kaydet
      if (result.appliedCampaign) {
        appliedCampaignsMap.set(result.appliedCampaign.id, result.appliedCampaign);
      }

      processedItems.push({
        ...item,
        originalPrice: itemPrice,
        discountedPrice: result.discountedPrice,
        itemDiscount,
        appliedCampaign: result.appliedCampaign,
      });
    }

    const discountedSubtotal = subtotal - totalDiscount;

    return {
      items: processedItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      discountedSubtotal: parseFloat(discountedSubtotal.toFixed(2)),
      appliedCampaigns: Array.from(appliedCampaignsMap.values()),
    };
  }

  /**
   * Tek kampanya için indirim hesapla
   * @private
   */
  _calculateSingleCampaignDiscount({ price, quantity, campaign }) {
    const { type, discountPercent, discountAmount, buyQuantity, getQuantity, maxDiscount } = campaign;

    let discount = 0;

    switch (type) {
      case 'PERCENTAGE':
        // Yüzde indirim
        discount = price * (parseFloat(discountPercent) / 100);
        break;

      case 'FIXED_AMOUNT':
        // Sabit tutar indirim
        discount = parseFloat(discountAmount);
        // İndirim ürün fiyatından fazla olamaz
        discount = Math.min(discount, price);
        break;

      case 'BUY_X_GET_Y':
        // X Al Y Öde kampanyası
        if (quantity >= buyQuantity) {
          // Kaç kez kampanyadan faydalanılabilir
          const sets = Math.floor(quantity / buyQuantity);
          // Her set'te kaç adet bedava
          const freeItems = buyQuantity - getQuantity;
          // Toplam bedava adet
          const totalFreeItems = sets * freeItems;
          // Toplam indirim = bedava ürün sayısı * fiyat
          discount = totalFreeItems * price;
        }
        break;

      case 'FREE_SHIPPING':
        // Ücretsiz kargo kampanyası
        // Bu sepet seviyesinde uygulanacak, ürün bazında değil
        discount = 0;
        break;

      default:
        discount = 0;
    }

    // Max indirim kontrolü
    if (maxDiscount && discount > parseFloat(maxDiscount)) {
      discount = parseFloat(maxDiscount);
    }

    return discount;
  }

  /**
   * Ürün için geçerli kampanyaları filtrele
   * @private
   */
  _filterApplicableCampaigns({ productId, categoryId, campaigns }) {
    return campaigns.filter((campaign) => {
      // FREE_SHIPPING kampanyaları ürün bazında değil, sepet bazında uygulanır
      if (campaign.type === 'FREE_SHIPPING') {
        return false;
      }

      // Tüm mağazaya uygulanan kampanyalar
      if (campaign.applyToAll) {
        return true;
      }

      // Kategoriye özgü kampanyalar
      if (categoryId && campaign.categoryIds) {
        const categoryIds = Array.isArray(campaign.categoryIds)
          ? campaign.categoryIds
          : [];
        if (categoryIds.includes(categoryId)) {
          return true;
        }
      }

      // Ürüne özgü kampanyalar
      if (productId && campaign.productIds) {
        const productIds = Array.isArray(campaign.productIds)
          ? campaign.productIds
          : [];
        if (productIds.includes(productId)) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Bedava kargo kampanyası kontrolü
   * @param {Object} params
   * @param {number} params.cartTotal - Sepet toplamı
   * @param {Array} params.campaigns - Kampanyalar
   * @returns {Object|null} Geçerli bedava kargo kampanyası veya null
   */
  checkFreeShipping({ cartTotal, campaigns = [] }) {
    const freeShippingCampaigns = campaigns.filter(
      (c) => c.type === 'FREE_SHIPPING' && c.isActive
    );

    for (const campaign of freeShippingCampaigns) {
      // Minimum tutar kontrolü
      if (campaign.minPurchase) {
        if (cartTotal >= parseFloat(campaign.minPurchase)) {
          return campaign;
        }
      } else {
        // Minimum tutar yoksa direkt uygula
        return campaign;
      }
    }

    return null;
  }

  /**
   * Kampanya badge bilgisi oluştur
   * @param {Object} campaign
   * @returns {string} Badge metni (örn: "-20%", "3 Al 2 Öde")
   */
  getCampaignBadge(campaign) {
    if (!campaign) return null;

    const { type, discountPercent, buyQuantity, getQuantity } = campaign;

    switch (type) {
      case 'PERCENTAGE':
        return `-${Math.round(discountPercent)}%`;

      case 'FIXED_AMOUNT':
        return 'İndirim';

      case 'BUY_X_GET_Y':
        return `${buyQuantity} Al ${getQuantity} Öde`;

      case 'FREE_SHIPPING':
        return 'Ücretsiz Kargo';

      default:
        return 'Kampanya';
    }
  }
}

export default new DiscountCalculator();
