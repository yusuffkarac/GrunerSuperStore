import { useEffect } from 'react';

/**
 * Modal açıldığında scroll'u yönetir
 * - Admin layout'ta main container'ı scroll eder (window değil)
 * - Container scroll'unu kilitler
 * - Modal kapandığında eski duruma döner
 * 
 * @param {boolean} isOpen - Modal açık mı?
 */
export const useModalScroll = (isOpen) => {
  useEffect(() => {
    // Admin layout'ta scroll eden container'ı bul
    // AdminLayout'ta main element overflow-y-auto ile scroll ediyor
    const scrollContainer = document.querySelector('main.overflow-y-auto');
    
    if (!scrollContainer) {
      console.log('[useModalScroll] Scroll container bulunamadı');
      return;
    }

    if (isOpen) {
      // Mevcut scroll pozisyonunu kaydet
      const scrollTop = scrollContainer.scrollTop;
      console.log('[useModalScroll] Modal açılıyor, mevcut scrollTop:', scrollTop);

      // Container'ın scroll'unu kilitle (önce kilitle, sonra scroll et)
      const previousOverflow = scrollContainer.style.overflow;
      scrollContainer.style.overflow = 'hidden';
      console.log('[useModalScroll] Container scroll kilitlendi');

      // Container'ı en üste scroll et (hızlı - anında)
      scrollContainer.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      console.log('[useModalScroll] Container yukarı scroll edildi');

      // Scroll pozisyonunu korumak için bir interval kur
      // Modal render edildikten sonra scroll tekrar aşağı inerse, tekrar yukarı al
      const scrollCheckInterval = setInterval(() => {
        if (scrollContainer.scrollTop > 0) {
          console.log('[useModalScroll] Scroll aşağı inmiş, tekrar yukarı alınıyor');
          scrollContainer.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
      }, 50);

      // İlk birkaç frame'de scroll'u kontrol et ve yukarıda tut
      let frameCount = 0;
      const scrollCheck = () => {
        frameCount++;
        if (scrollContainer.scrollTop > 0) {
          scrollContainer.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
        if (frameCount < 10) {
          requestAnimationFrame(scrollCheck);
        }
      };
      requestAnimationFrame(scrollCheck);

      // Scroll pozisyonunu ve overflow değerini data attribute'larında sakla
      scrollContainer.setAttribute('data-previous-scroll-top', scrollTop.toString());
      scrollContainer.setAttribute('data-previous-overflow', previousOverflow || '');

      // Temizleme: Modal kapandığında
      return () => {
        // Interval'i temizle
        clearInterval(scrollCheckInterval);
        
        // Kaydedilmiş değerleri al
        const savedScrollTop = parseInt(scrollContainer.getAttribute('data-previous-scroll-top') || '0', 10);
        const savedOverflow = scrollContainer.getAttribute('data-previous-overflow') || '';
        
        // Scroll'u geri aç
        scrollContainer.style.overflow = savedOverflow;
        console.log('[useModalScroll] Modal kapandı, container scroll açıldı');

        // Eski scroll pozisyonuna dön
        // requestAnimationFrame kullanarak DOM güncellemesinden sonra scroll yap
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            console.log('[useModalScroll] Eski scroll konumuna geri dönülüyor, scrollTop:', savedScrollTop);
            scrollContainer.scrollTo({ top: savedScrollTop, left: 0, behavior: 'auto' });
            
            // Data attribute'larını temizle
            scrollContainer.removeAttribute('data-previous-scroll-top');
            scrollContainer.removeAttribute('data-previous-overflow');
          });
        });
      };
    } else {
      // isOpen false olduğunda da scroll'u geri yükle (güvenlik için)
      const savedScrollTop = parseInt(scrollContainer.getAttribute('data-previous-scroll-top') || '0', 10);
      const savedOverflow = scrollContainer.getAttribute('data-previous-overflow') || '';
      
      if (savedScrollTop > 0 || savedOverflow) {
        scrollContainer.style.overflow = savedOverflow;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (savedScrollTop > 0) {
              scrollContainer.scrollTo({ top: savedScrollTop, left: 0, behavior: 'auto' });
            }
            scrollContainer.removeAttribute('data-previous-scroll-top');
            scrollContainer.removeAttribute('data-previous-overflow');
          });
        });
      }
    }
  }, [isOpen]);
};

export default useModalScroll;
