import { useState, useEffect, useRef } from 'react';
import { HiX, HiChevronLeft, HiChevronRight, HiZoomIn, HiZoomOut, HiChevronDoubleLeft, HiChevronDoubleRight, HiVolumeUp, HiVolumeOff } from 'react-icons/hi';
import * as pdfjsLib from 'pdfjs-dist';
import { PageFlip } from 'page-flip';
import { normalizeImageUrl } from '../../utils/imageUtils';

// PDF.js worker'ı ayarla - Vite için unpkg CDN kullan (daha güvenilir)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const MagazineViewer = ({ pdfUrl, title, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageFlipInstance, setPageFlipInstance] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const containerRef = useRef(null);
  const bookRef = useRef(null);
  const audioRef = useRef(null);
  const soundEnabledRef = useRef(true); // Ref ile güncel değeri tut

  // Ekran boyutu kontrolü
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 786); // 786px altında tek sayfa
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sayfa çevirme sesi - Gerçekçi kağıt sesi
  useEffect(() => {
    // Local ses dosyası kullan (public klasöründen)
    try {
      audioRef.current = new Audio('/page-flip.mp3');
      audioRef.current.volume = 0.4;
      // Ses dosyası yüklenirken hata olursa sessiz devam et
      audioRef.current.addEventListener('error', () => {
        audioRef.current = null;
      });
    } catch (err) {
      audioRef.current = null;
    }
  }, []);

  // soundEnabled state değiştiğinde ref'i güncelle
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Mouse scroll ile sayfa çevirme - Scroll biriktirme ile kontrollü
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !pageFlipInstance) return;

    let scrollAccumulator = 0;
    const scrollThreshold = 100; // Bu değeri aşınca sayfa değişir
    let lastScrollTime = Date.now();

    const handleWheel = (e) => {
      e.preventDefault();

      const currentTime = Date.now();
      const timeDiff = currentTime - lastScrollTime;

      // Eğer son scroll'dan 300ms geçtiyse accumulator'ı sıfırla
      if (timeDiff > 300) {
        scrollAccumulator = 0;
      }

      lastScrollTime = currentTime;
      scrollAccumulator += Math.abs(e.deltaY);

      // Eşik değeri aşıldıysa sayfa değiştir
      if (scrollAccumulator >= scrollThreshold) {
        if (e.deltaY > 0) {
          pageFlipInstance.flipNext();
        } else {
          pageFlipInstance.flipPrev();
        }
        scrollAccumulator = 0; // Sıfırla
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [pageFlipInstance]);

  useEffect(() => {
    if (pdfUrl) {
      loadPDF();
    }

    return () => {
      // Cleanup
      if (pageFlipInstance) {
        pageFlipInstance.destroy();
      }
    };
  }, [pdfUrl, isMobile]); // isMobile değişince yeniden yükle

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mobil kontrolü - her seferinde güncel değeri al
      const currentIsMobile = window.innerWidth < 786;
      console.log('[MagazineViewer] İlk yükleme - isMobile:', currentIsMobile, 'window.innerWidth:', window.innerWidth);

      // PDF URL'ini normalize et (backend URL'ine çevir)
      let normalizedPdfUrl = normalizeImageUrl(pdfUrl);
      console.log('[MagazineViewer] Orijinal PDF URL:', pdfUrl);
      console.log('[MagazineViewer] Normalize edilmiş PDF URL:', normalizedPdfUrl);

      // Eğer hala normalize edilmemişse (startsWith kontrolü)
      if (normalizedPdfUrl && !normalizedPdfUrl.startsWith('http://') && !normalizedPdfUrl.startsWith('https://')) {
        // API base URL'i al - sunucuda window.location.origin kullan
        let API_BASE = '';
        if (import.meta.env.VITE_API_URL) {
          API_BASE = import.meta.env.VITE_API_URL.endsWith('/api') 
            ? import.meta.env.VITE_API_URL.slice(0, -4) 
            : import.meta.env.VITE_API_URL;
        } else if (import.meta.env.DEV) {
          API_BASE = 'http://localhost:5001';
        } else {
          // Production'da window.location.origin kullan (sunucu URL'ini al)
          API_BASE = typeof window !== 'undefined' ? window.location.origin : '';
        }
        console.log('[MagazineViewer] API_BASE:', API_BASE);
        
        if (normalizedPdfUrl.startsWith('/uploads')) {
          normalizedPdfUrl = `${API_BASE}/api${normalizedPdfUrl}`;
        } else if (!normalizedPdfUrl.startsWith('/')) {
          normalizedPdfUrl = `${API_BASE}/api/uploads/${normalizedPdfUrl}`;
        } else {
          normalizedPdfUrl = `${API_BASE}${normalizedPdfUrl}`;
        }
        console.log('[MagazineViewer] Final PDF URL:', normalizedPdfUrl);
      }

      // PDF'i fetch ile blob olarak yükle (CORS sorunlarını önlemek için)
      let pdfData;
      try {
        console.log('[MagazineViewer] PDF fetch başlıyor...');
        const response = await fetch(normalizedPdfUrl, {
          mode: 'cors',
          credentials: 'omit',
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        pdfData = { data: arrayBuffer };
        console.log('[MagazineViewer] PDF fetch başarılı, boyut:', arrayBuffer.byteLength, 'bytes');
      } catch (fetchError) {
        console.error('[MagazineViewer] PDF fetch hatası:', fetchError);
        // Fetch başarısız olursa direkt URL ile dene
        pdfData = normalizedPdfUrl;
        console.log('[MagazineViewer] Direkt URL ile denenecek:', normalizedPdfUrl);
      }

      // PDF yükle
      console.log('[MagazineViewer] PDF.js ile yükleme başlıyor...');
      const loadingTask = pdfjsLib.getDocument(pdfData);
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      setTotalPages(numPages);
      console.log('[MagazineViewer] PDF yüklendi, sayfa sayısı:', numPages);

      // Container boyutlarını al - biraz bekle ki container render olsun
      const container = containerRef.current;
      if (!container) {
        console.error('[MagazineViewer] Container bulunamadı!');
        // Container yoksa biraz bekle ve tekrar dene
        await new Promise(resolve => setTimeout(resolve, 100));
        const containerRetry = containerRef.current;
        if (!containerRetry) {
          throw new Error('Container bulunamadı');
        }
      }

      // Container'ın boyutlarını al - birkaç kez dene
      let containerWidth = 0;
      let containerHeight = 0;
      for (let i = 0; i < 10; i++) {
        const container = containerRef.current;
        if (container) {
          containerWidth = container.clientWidth;
          containerHeight = container.clientHeight;
          if (containerWidth > 0 && containerHeight > 0) {
            break;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Padding düşüldükten sonraki gerçek kullanılabilir alan
      const padding = 32; // p-4 = 16px * 2 (her iki taraf)
      const finalContainerWidth = containerWidth - padding;
      const finalContainerHeight = containerHeight - padding;
      
      console.log('[MagazineViewer] Container boyutları:', {
        containerWidth,
        containerHeight,
        finalContainerWidth,
        finalContainerHeight,
        currentIsMobile
      });

      if (finalContainerWidth <= 0 || finalContainerHeight <= 0) {
        throw new Error(`Container boyutları geçersiz: ${finalContainerWidth}x${finalContainerHeight}`);
      }

      // Her sayfa için canvas oluştur - yüksek kalite için devicePixelRatio kullan
      const devicePixelRatio = window.devicePixelRatio || 1;
      const pages = [];
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });

        // Sayfa boyutlarını hesapla (container'a sığdır)
        // Desktop: 2 sayfa yan yana (containerWidth / 2)
        // Mobil: 1 sayfa (containerWidth)
        const pagesPerSpread = currentIsMobile ? 1 : 2;
        const displayScale = Math.min(
          (finalContainerWidth / pagesPerSpread / viewport.width) * 0.95,
          (finalContainerHeight / viewport.height) * 0.95
        );
        
        if (pageNum === 1) {
          console.log('[MagazineViewer] Sayfa boyutları:', {
            viewportWidth: viewport.width,
            viewportHeight: viewport.height,
            pagesPerSpread,
            displayScale
          });
        }

        // Render scale (yüksek kalite için devicePixelRatio kullan ama görüntülenen boyut aynı kalacak)
        const renderScale = displayScale * devicePixelRatio;
        const scaledViewport = page.getViewport({ scale: renderScale });

        // Canvas oluştur - yüksek çözünürlük için devicePixelRatio kullan
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Canvas boyutlarını render scale ile ayarla (yüksek çözünürlük)
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        
        // Canvas'ın görüntülenen boyutunu display scale ile ayarla (ekranda doğru boyutta görünsün)
        canvas.style.width = `${viewport.width * displayScale}px`;
        canvas.style.height = `${viewport.height * displayScale}px`;

        // Sayfayı render et - yüksek kalite
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;

        pages.push(canvas);
      }

      // StPageFlip başlat
      if (bookRef.current) {
        console.log('[MagazineViewer] PageFlip başlatılıyor, sayfa sayısı:', pages.length);
        initPageFlip(pages, currentIsMobile);
        console.log('[MagazineViewer] PageFlip başlatıldı');
      } else {
        console.error('[MagazineViewer] bookRef.current bulunamadı!');
      }

      setLoading(false);
      console.log('[MagazineViewer] PDF yükleme tamamlandı');
    } catch (err) {
      console.error('PDF yükleme hatası:', err);
      const errorMessage = err.message || 'PDF konnte nicht geladen werden';
      setError(`PDF konnte nicht geladen werden: ${errorMessage}`);
      setLoading(false);
    }
  };

  const initPageFlip = (pages, currentIsMobile) => {
    console.log('[MagazineViewer] initPageFlip çağrıldı, pages:', pages.length, 'isMobile:', currentIsMobile);
    
    // Mevcut instance'ı temizle
    if (pageFlipInstance) {
      console.log('[MagazineViewer] Mevcut PageFlip instance temizleniyor');
      pageFlipInstance.destroy();
    }

    // Book container'ı temizle
    if (!bookRef.current) {
      console.error('[MagazineViewer] bookRef.current yok!');
      return;
    }
    
    bookRef.current.innerHTML = '';

    // Sayfaları book container'a ekle
    pages.forEach((canvas, index) => {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'magazine-page';
      pageDiv.appendChild(canvas);
      bookRef.current.appendChild(pageDiv);
    });

    // PageFlip'i başlat - canvas'ın görüntülenen boyutlarını kullan
    const firstCanvas = pages[0];
    const pageWidth = firstCanvas ? parseInt(firstCanvas.style.width) : 400;
    const pageHeight = firstCanvas ? parseInt(firstCanvas.style.height) : 600;
    
    console.log('[MagazineViewer] PageFlip boyutları:', { pageWidth, pageHeight });


    const pageFlip = new PageFlip(bookRef.current, {
      width: pageWidth,
      height: pageHeight,
      size: 'fixed', // fixed boyut kullan
      orientation: currentIsMobile ? 'portrait' : 'landscape', // Mobil: dikey, Desktop: yatay
      renderOnlyVisible: true, // Sadece görünen sayfaları render et (performans)
      minWidth: 315,
      maxWidth: 2000,
      minHeight: 400,
      maxHeight: 2000,
      showCover: false,
      mobileScrollSupport: true,
      swipeDistance: 30,
      clickEventForward: true,
      usePortrait: currentIsMobile, // Mobilde portrait
      startPage: 0,
      drawShadow: true,
      flippingTime: 1000,
      useMouseEvents: true,
      autoSize: false,
      maxShadowOpacity: 0.5,
      showPageCorners: true,
      disableFlipByClick: false,
    });

    try {
      pageFlip.loadFromHTML(Array.from(bookRef.current.children));
      console.log('[MagazineViewer] PageFlip HTML yüklendi');
    } catch (loadError) {
      console.error('[MagazineViewer] PageFlip loadFromHTML hatası:', loadError);
      throw loadError;
    }

    // Event listeners
    pageFlip.on('flip', (e) => {
      console.log('[MagazineViewer] Sayfa çevrildi:', e.data);
      setCurrentPage(e.data);

      // Sayfa çevirme sesi çal - ref kullanarak güncel değeri kontrol et
      if (soundEnabledRef.current && audioRef.current) {
        audioRef.current.currentTime = 0; // Ses baştan başlasın
        audioRef.current.play().catch(err => console.log('Ses çalma hatası:', err));
      }
    });

    setPageFlipInstance(pageFlip);
    console.log('[MagazineViewer] PageFlip instance ayarlandı');
  };

  const handlePrevPage = () => {
    if (pageFlipInstance) {
      pageFlipInstance.flipPrev();
    }
  };

  const handleNextPage = () => {
    if (pageFlipInstance) {
      pageFlipInstance.flipNext();
    }
  };

  const handleFirstPage = () => {
    if (pageFlipInstance) {
      pageFlipInstance.turnToPage(0);
    }
  };

  const handleLastPage = () => {
    if (pageFlipInstance) {
      pageFlipInstance.turnToPage(totalPages - 1);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2)); // Max 2x zoom
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5)); // Min 0.5x zoom
  };

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-2 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold">{title}</h2>
          {!loading && totalPages > 0 && (
            <p className="text-sm text-gray-400">
              Seite {currentPage + 1} von {totalPages}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Zoom Controls */}
          {!loading && !error && (
            <>
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Verkleinern"
                title="Verkleinern"
              >
                <HiZoomOut className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-400 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 2}
                className="p-1 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Vergrößern"
                title="Vergrößern"
              >
                <HiZoomIn className="h-5 w-5" />
              </button>

              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                className="p-1 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                aria-label={soundEnabled ? "Ton deaktivieren" : "Ton aktivieren"}
                title={soundEnabled ? "Ton deaktivieren" : "Ton aktivieren"}
              >
                {soundEnabled ? (
                  <HiVolumeUp className="h-5 w-5" />
                ) : (
                  <HiVolumeOff className="h-5 w-5" />
                )}
              </button>
            </>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1 text-white hover:text-gray-300 transition-colors"
            aria-label="Schließen"
          >
            <HiX className="h-8 w-8" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden p-4">
        {loading && (
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p>Prospekt wird geladen...</p>
          </div>
        )}

        {error && (
          <div className="text-center text-white">
            <p className="text-red-400 text-xl mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Schließen
            </button>
          </div>
        )}

        {!loading && !error && (
          <div
            ref={bookRef}
            className="magazine-container"
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease-in-out' }}
          ></div>
        )}
      </div>

      {/* Navigation Controls */}
      {!loading && !error && (
        <div className="bg-gray-900 p-4 flex justify-center items-center space-x-3">
          {/* İlk Sayfa */}
          <button
            onClick={handleFirstPage}
            disabled={currentPage === 0}
            className="p-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Erste Seite"
            title="Erste Seite"
          >
            <HiChevronDoubleLeft className="h-6 w-6" />
          </button>

          {/* Önceki Sayfa */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="p-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Vorherige Seite"
            title="Vorherige Seite"
          >
            <HiChevronLeft className="h-6 w-6" />
          </button>

          {/* Sayfa Numarası */}
          <span className="text-white text-sm min-w-[5rem] text-center">
            {currentPage + 1} / {totalPages}
          </span>

          {/* Sonraki Sayfa */}
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1}
            className="p-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Nächste Seite"
            title="Nächste Seite"
          >
            <HiChevronRight className="h-6 w-6" />
          </button>

          {/* Son Sayfa */}
          <button
            onClick={handleLastPage}
            disabled={currentPage >= totalPages - 1}
            className="p-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Letzte Seite"
            title="Letzte Seite"
          >
            <HiChevronDoubleRight className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* CSS for magazine */}
      <style>{`
        .magazine-container {
          position: relative;
          margin: 0 auto;
          max-width: 100%;
          max-height: 100%;
        }

        .magazine-page {
          background-color: white;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .magazine-page canvas {
          width: 100% !important;
          height: 100% !important;
          display: block;
          object-fit: contain;
        }

        /* PageFlip kütüphanesi için */
        .stf__wrapper {
          max-width: 100%;
          max-height: 100%;
        }

        /* Desktop: 2 sayfa yan yana */
        @media (min-width: 786px) {
          .magazine-container {
            width: fit-content;
          }
        }

        /* Mobil: 1 sayfa */
        @media (max-width: 785px) {
          .magazine-container {
            width: 100%;
          }
          
          /* PageFlip mobilde tek sayfa göstermesi için */
          .stf__item {
            width: 100% !important;
          }
          
          .stf__item--right {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MagazineViewer;
