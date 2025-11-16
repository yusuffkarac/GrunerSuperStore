import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FiX, FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut, FiMaximize2 } from 'react-icons/fi';
import { useSwipeable } from 'react-swipeable';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { normalizeImageUrl } from '../../utils/imageUtils';

// PDF.js worker'ı ayarla
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

function WeeklyDiscountMagazineModal({ pdfUrl, title, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [pagePairs, setPagePairs] = useState([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragCurrentX = useRef(0);
  const scrollLeft = useRef(0);
  const containerScrollLeft = useRef(0);

  // PDF yükleme
  useEffect(() => {
    if (!pdfUrl) {
      setError('PDF URL bulunamadı');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
  }, [pdfUrl]);

  // Sayfa çiftlerini oluştur (yan yana iki sayfa)
  const createPagePairs = (totalPages) => {
    const pairs = [];
    for (let i = 0; i < totalPages; i += 2) {
      pairs.push({
        left: i + 1,
        right: i + 2 <= totalPages ? i + 2 : null,
      });
    }
    return pairs;
  };

  // PDF yüklendiğinde
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    const pairs = createPagePairs(numPages);
    setPagePairs(pairs);
    setCurrentPairIndex(0);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF yükleme hatası:', error);
    setError('PDF yüklenemedi. Lütfen tekrar deneyin.');
    setLoading(false);
  };

  // Önceki sayfa çifti
  const goToPreviousPair = () => {
    if (currentPairIndex > 0) {
      setCurrentPairIndex(currentPairIndex - 1);
    }
  };

  // Sonraki sayfa çifti
  const goToNextPair = () => {
    if (currentPairIndex < pagePairs.length - 1) {
      setCurrentPairIndex(currentPairIndex + 1);
    }
  };

  // Zoom in
  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  // Zoom out
  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  // Reset zoom
  const resetZoom = () => {
    setScale(1.0);
  };

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragCurrentX.current = e.clientX;
    scrollLeft.current = containerScrollLeft.current;
    e.preventDefault();
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    
    dragCurrentX.current = e.clientX;
    const diffX = dragStartX.current - dragCurrentX.current;
    
    // Eğer yeterince kaydırıldıysa sayfa değiştir
    if (Math.abs(diffX) > 100) {
      if (diffX > 0) {
        // Sağa kaydırma - sonraki sayfa
        goToNextPair();
      } else {
        // Sola kaydırma - önceki sayfa
        goToPreviousPair();
      }
      isDragging.current = false;
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grab';
      }
    }
  }, [currentPairIndex, pagePairs.length]);

  const handleMouseUp = () => {
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  // Touch handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      dragStartX.current = e.touches[0].clientX;
      dragCurrentX.current = e.touches[0].clientX;
      scrollLeft.current = containerScrollLeft.current;
    }
  };

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current || e.touches.length !== 1) return;
    
    dragCurrentX.current = e.touches[0].clientX;
    const diffX = dragStartX.current - dragCurrentX.current;
    
    // Eğer yeterince kaydırıldıysa sayfa değiştir
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Sağa kaydırma - sonraki sayfa
        goToNextPair();
      } else {
        // Sola kaydırma - önceki sayfa
        goToPreviousPair();
      }
      isDragging.current = false;
    }
  }, [currentPairIndex, pagePairs.length]);

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  // Swipeable handlers (react-swipeable kütüphanesi)
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentPairIndex < pagePairs.length - 1) {
        goToNextPair();
      }
    },
    onSwipedRight: () => {
      if (currentPairIndex > 0) {
        goToPreviousPair();
      }
    },
    trackMouse: true,
    trackTouch: true,
  });

  // ESC tuşu ile kapat
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    // Mouse ve touch event listener'ları
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('mouseleave', handleMouseUp);
      container.addEventListener('touchmove', handleTouchMove);
      container.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('mouseleave', handleMouseUp);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [onClose, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Normalize PDF URL
  const normalizedPdfUrl = normalizeImageUrl(pdfUrl);

  const currentPair = pagePairs[currentPairIndex];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-[95vw] w-full max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="text-xl font-bold text-gray-900">{title || 'Haftalık İndirimler Dergisi'}</h3>
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300 p-1">
              <button
                onClick={zoomOut}
                disabled={scale <= 0.5}
                className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                aria-label="Zoom Out"
              >
                <FiZoomOut className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600 px-2 min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={scale >= 3.0}
                className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                aria-label="Zoom In"
              >
                <FiZoomIn className="w-5 h-5" />
              </button>
              {scale !== 1.0 && (
                <button
                  onClick={resetZoom}
                  className="p-2 text-gray-600 hover:text-gray-900 rounded transition-colors"
                  aria-label="Reset Zoom"
                >
                  <FiMaximize2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              aria-label="Schließen"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div
          ref={containerRef}
          {...swipeHandlers}
          className="flex-1 overflow-auto bg-gray-100 p-4 flex items-center justify-center"
          style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-600">PDF wird geladen...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Schließen
              </button>
            </div>
          )}

          {!loading && !error && normalizedPdfUrl && (
            <div className="flex flex-col items-center gap-4">
              <Document
                file={normalizedPdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                    <p className="text-gray-600">PDF wird geladen...</p>
                  </div>
                }
              >
                <div className="flex gap-4 items-center justify-center flex-wrap">
                  {/* Sol sayfa */}
                  {currentPair && (
                    <div className="bg-white shadow-lg rounded overflow-hidden">
                      <Page
                        pageNumber={currentPair.left}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="border border-gray-300"
                      />
                    </div>
                  )}

                  {/* Sağ sayfa */}
                  {currentPair && currentPair.right && (
                    <div className="bg-white shadow-lg rounded overflow-hidden">
                      <Page
                        pageNumber={currentPair.right}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="border border-gray-300"
                      />
                    </div>
                  )}
                </div>
              </Document>

              {/* Sayfa bilgisi */}
              {numPages && (
                <p className="text-sm text-gray-600 mt-4">
                  Seite {currentPair?.left || 0}
                  {currentPair?.right && `-${currentPair.right}`} von {numPages}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer - Navigation */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={goToPreviousPair}
            disabled={currentPairIndex === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiChevronLeft className="w-5 h-5" />
            <span>Vorherige</span>
          </button>

          <div className="flex items-center gap-2">
            {pagePairs.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPairIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentPairIndex
                    ? 'bg-primary-600 w-8'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Seite ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={goToNextPair}
            disabled={currentPairIndex >= pagePairs.length - 1}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span>Nächste</span>
            <FiChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default WeeklyDiscountMagazineModal;

