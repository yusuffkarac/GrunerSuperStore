import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'react-toastify';
import {
  FiArrowLeft,
  FiPackage,
  FiTruck,
  FiMapPin,
  FiCreditCard,
  FiFileText,
  FiStar,
  FiDownload,
} from 'react-icons/fi';
import orderService from '../services/orderService';

// OrderStatusBadge'i Siparislerim'den kopyalayabilirsiniz veya ortak bir component yapabilirsiniz
import { OrderStatusBadge } from './Siparislerim';
import { normalizeImageUrl } from '../utils/imageUtils';

// Yıldız Rating Bileşeni
function StarRating({ rating, onRatingChange, readonly = false }) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onRatingChange && onRatingChange(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          className={`transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <FiStar
            className={`w-8 h-8 transition-colors ${
              star <= (hoverRating || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function SiparisDetay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOrderDetails();
    loadReview();
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      const response = await orderService.getOrderById(id);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Sipariş detay hatası:', error);
      toast.error('Bestellung konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadReview = async () => {
    try {
      setReviewLoading(true);
      const response = await orderService.getReview(id);
      if (response.data.review) {
        setReview(response.data.review);
      }
    } catch (error) {
      // Review yoksa hata vermez, sadece null döner
      console.log('Review yok veya yüklenemedi');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Bitte wählen Sie eine Bewertung');
      return;
    }

    try {
      setSubmitting(true);
      await orderService.createReview(id, {
        rating,
        comment: comment.trim() || undefined,
      });

      toast.success('Bewertung erfolgreich abgegeben!');
      setShowReviewForm(false);
      setRating(0);
      setComment('');
      loadReview(); // Review'ı yeniden yükle
    } catch (error) {
      console.error('Review hatası:', error);
      toast.error(error.response?.data?.message || 'Bewertung konnte nicht gespeichert werden');
    } finally {
      setSubmitting(false);
    }
  };

  // Fatura PDF indir
  const handleDownloadInvoice = () => {
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    window.open(`${apiUrl}/orders/${id}/invoice?token=${token}`, '_blank');
  };

  if (loading) {
    return (
      <div className="container-mobile py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="bg-gray-200 rounded-lg h-40 mb-4"></div>
          <div className="bg-gray-200 rounded-lg h-60"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-mobile py-6">
        <p className="text-center text-gray-600">Bestellung nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="container-mobile py-4 pb-20">
      {/* Header */}
      <button
        onClick={() => navigate('/siparislerim')}
        className="flex items-center gap-2 text-green-600 mb-4 hover:text-green-700 transition-colors"
      >
        <FiArrowLeft className="text-lg" />
        <span className="text-sm font-medium">Zurück zu Bestellungen</span>
      </button>

      {/* Sipariş Bilgileri */}
      <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Bestellung #{order.orderNo}</h1>
            <p className="text-sm text-gray-500">
              {format(new Date(order.createdAt), 'dd. MMMM yyyy, HH:mm', { locale: de })}
            </p>
          </div>
          <div className="ml-4">
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        {/* Teslimat/Ödeme Bilgileri */}
        <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-100">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5">
              {order.type === 'delivery' ? (
                <FiTruck className="text-gray-400 text-lg" />
              ) : (
                <FiPackage className="text-gray-400 text-lg" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Lieferart</p>
              <p className="text-sm font-semibold text-gray-900">
                {order.type === 'delivery' ? 'Lieferung' : 'Abholung'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5">
              <FiCreditCard className="text-gray-400 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Zahlung</p>
              <p className="text-sm font-semibold text-gray-900">
                {order.paymentType === 'cash' ? 'Bar' : 'Karte'}
              </p>
            </div>
          </div>
        </div>

        {/* Adres bilgisi */}
        {order.address && (
          <div className="py-4 border-t border-gray-100 flex items-start gap-2.5">
            <div className="mt-0.5">
              <FiMapPin className="text-gray-400 text-lg" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1.5">Lieferadresse</p>
              {order.address.title && (
                <p className="text-sm font-semibold text-gray-900 mb-1">{order.address.title}</p>
              )}
              <p className="text-sm text-gray-700 leading-relaxed">
                {order.address.street} {order.address.houseNumber}
                <br />
                {order.address.postalCode} {order.address.city}
              </p>
            </div>
          </div>
        )}

        {/* Fatura İndir - Sadece admin gönderdiyse göster */}
        {order.invoiceSent && (
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleDownloadInvoice}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <FiDownload size={18} />
              Rechnung als PDF herunterladen
            </button>
          </div>
        )}

        {/* Not */}
        {order.note && (
          <div className="pt-4 border-t border-gray-100 flex items-start gap-2.5">
            <div className="mt-0.5">
              <FiFileText className="text-gray-400 text-lg" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Notiz</p>
              <p className="text-sm text-gray-700 leading-relaxed">{order.note}</p>
            </div>
          </div>
        )}

        {/* İptal Sebebi ve Mesajı - Sadece iptal edilmişse ve gösterilmesi gerekiyorsa */}
        {order.status === 'cancelled' && order.showCancellationReasonToCustomer && order.cancellationReason && (
          <div className="pt-4 border-t border-gray-100">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-900 mb-2">Grund für die Stornierung:</p>
              <p className="text-sm text-red-800">{order.cancellationReason}</p>
            </div>
          </div>
        )}

        {/* Müşteri Mesajı - İptal edilmişse ve mesaj varsa */}
        {order.status === 'cancelled' && order.cancellationCustomerMessage && (
          <div className="pt-4 border-t border-gray-100">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Nachricht für Sie:</p>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">{order.cancellationCustomerMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Ürünler */}
      <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4 text-base">Bestellte Artikel</h2>
        <div className="space-y-4">
          {order.orderItems?.map((item) => (
            <div 
              key={item.id} 
              className="flex gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              onClick={() => navigate(`/urun/${item.productId}`)}
            >
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                {item.imageUrl ? (
                  <img src={normalizeImageUrl(item.imageUrl)} alt={item.productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FiPackage className="text-gray-400 text-xl" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm mb-1">{item.productName}</p>
                {item.variantName && (
                  <p className="text-xs text-purple-600 font-medium mt-0.5 mb-1">
                    {item.variantName}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {parseFloat(item.price).toFixed(2)} € × {item.quantity}
                </p>
              </div>
              <div className="flex-shrink-0">
                <p className="font-semibold text-gray-900 text-sm whitespace-nowrap">
                  {(parseFloat(item.price) * item.quantity).toFixed(2)} €
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Toplam */}
        <div className="mt-5 pt-4 border-t border-gray-200 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Zwischensumme</span>
            <span className="text-gray-900 font-medium">{parseFloat(order.subtotal).toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Liefergebühr</span>
            <span className="text-gray-900 font-medium">{parseFloat(order.deliveryFee).toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-3 mt-3 border-t border-gray-200">
            <span className="text-gray-900">Gesamt</span>
            <span className="text-green-600">{parseFloat(order.total).toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Review Bölümü - Sadece Delivered Siparişler İçin */}
      {order.status === 'delivered' && (
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4 text-base">Bewertung</h2>

          {reviewLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48 mb-3"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ) : review ? (
            // Mevcut Review Göster
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-2">Ihre Bewertung</p>
                <StarRating rating={review.rating} readonly />
              </div>
              {review.comment && (
                <div>
                  <p className="text-sm text-gray-600 mb-1.5">Ihr Kommentar</p>
                  <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500 pt-2">
                Bewertet am {format(new Date(review.createdAt), 'dd. MMMM yyyy, HH:mm', { locale: de })}
              </p>
            </div>
          ) : showReviewForm ? (
            // Review Form
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Wie zufrieden sind Sie mit dieser Bestellung? *
                </label>
                <StarRating rating={rating} onRatingChange={setRating} />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Kommentar (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Teilen Sie Ihre Erfahrungen mit dieser Bestellung..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">{comment.length}/1000</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || rating === 0}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  {submitting ? 'Wird gesendet...' : 'Bewertung abgeben'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewForm(false);
                    setRating(0);
                    setComment('');
                  }}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          ) : (
            // Review Butonu
            <button
              onClick={() => setShowReviewForm(true)}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <FiStar className="text-lg" />
              Diese Bestellung bewerten
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SiparisDetay;
