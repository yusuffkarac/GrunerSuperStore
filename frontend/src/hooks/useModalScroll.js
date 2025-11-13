import { useEffect } from 'react';

/**
 * Modal açıldığında scroll'u yönetir
 * - Sayfayı en üste scroll eder
 * - Body scroll'unu kilitler
 * - Modal kapandığında eski duruma döner
 * 
 * @param {boolean} isOpen - Modal açık mı?
 */
export const useModalScroll = (isOpen) => {
  useEffect(() => {
    if (isOpen) {
      // Mevcut scroll pozisyonunu sakla
      const scrollY = window.scrollY;
      console.log('[useModalScroll] Modal açılıyor, mevcut scrollY:', scrollY);
      
      // Sayfayı yukarı scroll et (smooth scroll)
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      console.log('[useModalScroll] Sayfa yukarı scroll edildi (smooth)');
      
      // Body scroll'unu kilitle (modal açıkken scroll yapılmasın)
      document.body.style.overflow = 'hidden';
      console.log('[useModalScroll] Body scroll kilitlendi');

      // Cleanup: Modal kapandığında
      return () => {
        // Scroll'u geri aç
        document.body.style.overflow = '';
        console.log('[useModalScroll] Modal kapandı, body scroll açıldı');
        
        // Eski scroll pozisyonuna dön (ama biraz gecikme ile, çünkü smooth scroll bitmeli)
        setTimeout(() => {
          console.log('[useModalScroll] Eski scroll konumuna geri dönülüyor, scrollY:', scrollY);
          window.scrollTo({
            top: scrollY,
            behavior: 'smooth'
          });
        }, 100);
      };
    }
  }, [isOpen]);
};

export default useModalScroll;
