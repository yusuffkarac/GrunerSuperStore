import { useEffect, useRef } from 'react';

/**
 * Modal açıldığında scroll'u yönetir
 * - Admin layout'ta main container'ı scroll eder (window değil)
 * - Container scroll'unu kilitler
 * - Modal kapandığında eski duruma döner
 * 
 * @param {boolean} isOpen - Modal açık mı?
 */
export const useModalScroll = (isOpen) => {
  // Scroll pozisyonunu ref ile sakla (cleanup'ta erişilebilir olması için)
  const savedScrollDataRef = useRef({ scrollTop: 0, overflow: '' });
  const scrollCheckRAFRef = useRef(null);
  const isCleaningUpRef = useRef(false);
  const scrollHandlerRef = useRef(null);
  const prevIsOpenRef = useRef(isOpen);

  // Scroll pozisyonunu sürekli takip et (modal kapalıyken)
  useEffect(() => {
    const scrollContainer = document.querySelector('main.overflow-y-auto');
    if (!scrollContainer || isOpen) return;

    // Modal kapalıyken scroll pozisyonunu sürekli kaydet
    const updateScrollPosition = () => {
      const scrollTop = scrollContainer.scrollTop;
      if (scrollTop > 0) {
        scrollContainer.setAttribute('data-last-scroll-top', scrollTop.toString());
      }
    };

    // Scroll event listener ekle
    scrollContainer.addEventListener('scroll', updateScrollPosition, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', updateScrollPosition);
    };
  }, [isOpen]);

  // isOpen değişmeden önce scroll pozisyonunu kaydet
  // Bu effect, isOpen değişmeden hemen önce çalışır
  useEffect(() => {
    const scrollContainer = document.querySelector('main.overflow-y-auto');
    if (!scrollContainer) {
      prevIsOpenRef.current = isOpen;
      return;
    }

    // isOpen false'dan true'ya geçiyorsa, scroll pozisyonunu hemen kaydet
    if (!prevIsOpenRef.current && isOpen) {
      const currentModalCount = parseInt(scrollContainer.getAttribute('data-modal-count') || '0', 10);
      
      // Sadece ilk modal açıldığında scroll pozisyonunu kaydet
      if (currentModalCount === 0) {
        // Önce mevcut scroll pozisyonunu al
        let scrollTop = scrollContainer.scrollTop;
        
        // Eğer scroll pozisyonu 0 ise, son kaydedilmiş pozisyonu kullan
        if (scrollTop === 0) {
          const lastScrollTop = parseInt(scrollContainer.getAttribute('data-last-scroll-top') || '0', 10);
          if (lastScrollTop > 0) {
            scrollTop = lastScrollTop;
            console.log('[useModalScroll] Scroll pozisyonu 0, son kaydedilmiş pozisyon kullanılıyor:', scrollTop);
          }
        }
        
        const previousOverflow = scrollContainer.style.overflow || '';
        
        savedScrollDataRef.current = {
          scrollTop,
          overflow: previousOverflow
        };
        
        scrollContainer.setAttribute('data-previous-scroll-top', scrollTop.toString());
        scrollContainer.setAttribute('data-previous-overflow', previousOverflow);
        console.log('[useModalScroll] İlk modal açılıyor, scroll pozisyonu kaydedildi:', scrollTop);
      }
    }
    
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Admin layout'ta scroll eden container'ı bul
    // AdminLayout'ta main element overflow-y-auto ile scroll ediyor
    const scrollContainer = document.querySelector('main.overflow-y-auto');
    
    if (!scrollContainer) {
      console.log('[useModalScroll] Scroll container bulunamadı');
      return;
    }

    if (isOpen) {
      // Cleanup flag'ini sıfırla
      isCleaningUpRef.current = false;

      // Modal sayacını artır
      const currentModalCount = parseInt(scrollContainer.getAttribute('data-modal-count') || '0', 10);
      const newModalCount = currentModalCount + 1;
      scrollContainer.setAttribute('data-modal-count', newModalCount.toString());
      
      // Eğer scroll pozisyonu kaydedilmemişse (ilk modal değilse), mevcut kaydedilmiş pozisyonu al
      if (currentModalCount > 0) {
        const savedScrollTop = parseInt(scrollContainer.getAttribute('data-previous-scroll-top') || '0', 10);
        const savedOverflow = scrollContainer.getAttribute('data-previous-overflow') || '';
        savedScrollDataRef.current = {
          scrollTop: savedScrollTop,
          overflow: savedOverflow
        };
        console.log('[useModalScroll] Yeni modal açılıyor (toplam:', newModalCount, '), mevcut scroll pozisyonu korunuyor');
      }

      // Container'ı en üste scroll et (yumuşak animasyon ile)
      scrollContainer.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      
      // Container'ın scroll'unu kilitle
      scrollContainer.style.overflow = 'hidden';
      console.log('[useModalScroll] Container scroll kilitlendi ve yukarı alındı');

      // Scroll pozisyonunu korumak için scroll event listener ekle
      // Bu, interval'den daha performanslı ve güvenilir
      const handleScroll = () => {
        if (isCleaningUpRef.current) return;
        
        if (scrollContainer.scrollTop > 0) {
          console.log('[useModalScroll] Scroll aşağı inmiş, tekrar yukarı alınıyor');
          scrollContainer.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
      };

      scrollHandlerRef.current = handleScroll;
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

      // İlk birkaç frame'de scroll'u kontrol et (modal render olurken)
      let frameCount = 0;
      const scrollCheck = () => {
        if (isCleaningUpRef.current) return;
        
        frameCount++;
        if (scrollContainer.scrollTop > 0) {
          scrollContainer.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
        if (frameCount < 15) {
          scrollCheckRAFRef.current = requestAnimationFrame(scrollCheck);
        } else {
          scrollCheckRAFRef.current = null;
        }
      };
      scrollCheckRAFRef.current = requestAnimationFrame(scrollCheck);

      // Temizleme: Modal kapandığında
      return () => {
        isCleaningUpRef.current = true;

        // RAF'i iptal et
        if (scrollCheckRAFRef.current) {
          cancelAnimationFrame(scrollCheckRAFRef.current);
          scrollCheckRAFRef.current = null;
        }

        // Scroll event listener'ı kaldır
        if (scrollHandlerRef.current) {
          scrollContainer.removeEventListener('scroll', scrollHandlerRef.current);
          scrollHandlerRef.current = null;
        }

        // Kaydedilmiş değerleri al (attribute'tan, çünkü ilk modal açıldığında kaydedildi)
        const savedData = {
          scrollTop: parseInt(scrollContainer.getAttribute('data-previous-scroll-top') || '0', 10),
          overflow: scrollContainer.getAttribute('data-previous-overflow') || ''
        };

        // Modal sayacını azalt
        const currentModalCount = parseInt(scrollContainer.getAttribute('data-modal-count') || '0', 10);
        const newModalCount = Math.max(0, currentModalCount - 1);
        scrollContainer.setAttribute('data-modal-count', newModalCount.toString());
        console.log('[useModalScroll] Modal kapandı, kalan modal sayısı:', newModalCount);

        // Eski scroll pozisyonuna dön
        // DOM güncellemesinden sonra scroll yapmak için double RAF kullan
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Eğer başka bir modal açıksa (sayacı > 0), sadece scroll yapma
            // Overflow'u da değiştirme, çünkü başka modal hala açık
            if (newModalCount > 0) {
              console.log('[useModalScroll] Başka modal açık, scroll yapılmıyor (kalan:', newModalCount, ')');
              // Sadece bu modal'ın attribute'larını temizle, ama overflow'u değiştirme
              scrollContainer.removeAttribute('data-previous-scroll-top');
              scrollContainer.removeAttribute('data-previous-overflow');
            } else {
              // Son modal kapandı, scroll'u geri aç
              scrollContainer.style.overflow = savedData.overflow;
              console.log('[useModalScroll] Son modal kapandı, container scroll açıldı');
              
              console.log('[useModalScroll] Eski scroll konumuna geri dönülüyor, scrollTop:', savedData.scrollTop);
              scrollContainer.scrollTo({ top: savedData.scrollTop, left: 0, behavior: 'auto' });
              
              // Data attribute'larını temizle
              scrollContainer.removeAttribute('data-previous-scroll-top');
              scrollContainer.removeAttribute('data-previous-overflow');
              scrollContainer.removeAttribute('data-modal-count');
            }
          });
        });
      };
    }
    // else bloğu gerekli değil - cleanup zaten çalışacak
  }, [isOpen]);
};

export default useModalScroll;
