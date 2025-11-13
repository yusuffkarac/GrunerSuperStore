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
    if (isOpen) {
      // Admin layout'ta scroll eden container'ı bul
      // AdminLayout'ta main element overflow-y-auto ile scroll ediyor
      const scrollContainer = document.querySelector('main.overflow-y-auto');
      
      if (!scrollContainer) {
        console.log('[useModalScroll] Scroll container bulunamadı');
        return;
      }

      // Mevcut scroll pozisyonunu kaydet
      const scrollTop = scrollContainer.scrollTop;
      console.log('[useModalScroll] Modal açılıyor, mevcut scrollTop:', scrollTop);

      // Container'ı en üste scroll et
      scrollContainer.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      console.log('[useModalScroll] Container yukarı scroll edildi');

      // Container'ın scroll'unu kilitle
      const previousOverflow = scrollContainer.style.overflow;
      scrollContainer.style.overflow = 'hidden';
      console.log('[useModalScroll] Container scroll kilitlendi');

      // Temizleme: Modal kapandığında
      return () => {
        // Scroll'u geri aç
        scrollContainer.style.overflow = previousOverflow;
        console.log('[useModalScroll] Modal kapandı, container scroll açıldı');

        // Eski scroll pozisyonuna dön
        setTimeout(() => {
          console.log('[useModalScroll] Eski scroll konumuna geri dönülüyor, scrollTop:', scrollTop);
          scrollContainer.scrollTo({ top: scrollTop, left: 0, behavior: 'smooth' });
        }, 100);
      };
    }
  }, [isOpen]);
};

export default useModalScroll;
