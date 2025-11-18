import { createContext, useContext, useEffect } from 'react';

const ModalContext = createContext({
  allowBackdropClose: false, // Varsayılan olarak backdrop click ile kapatma kapalı
});

export function ModalProvider({ children, allowBackdropClose = false }) {
  useEffect(() => {
    if (!allowBackdropClose) {
      // Global backdrop click engelleme
      const handleClick = (e) => {
        const target = e.target;
        
        // Backdrop elementlerini tespit et
        // Modal backdrop'ları genellikle: fixed inset-0 + bg-black/bg-opacity class'larına sahip
        const isBackdrop = 
          target.classList.contains('fixed') &&
          (target.classList.contains('inset-0') || 
           getComputedStyle(target).position === 'fixed' &&
           (getComputedStyle(target).top === '0px' || 
            getComputedStyle(target).inset === '0px')) &&
          (target.classList.toString().includes('bg-black') || 
           target.classList.toString().includes('bg-opacity') ||
           getComputedStyle(target).backgroundColor.includes('rgba(0, 0, 0') ||
           getComputedStyle(target).backgroundColor.includes('rgb(0, 0, 0'));
        
        if (isBackdrop) {
          // Modal içeriğine tıklanmadıysa (sadece backdrop'a tıklandıysa) engelle
          // Modal içeriği genellikle: bg-white, rounded, shadow class'larına sahip
          const clickedElement = e.target;
          const isModalContent = 
            clickedElement.closest('.bg-white') ||
            clickedElement.closest('[class*="rounded"]') ||
            clickedElement.closest('[class*="shadow"]') ||
            clickedElement.closest('button') ||
            clickedElement.closest('input') ||
            clickedElement.closest('textarea') ||
            clickedElement.closest('select');
          
          // Eğer backdrop'a direkt tıklandıysa ve modal içeriğine tıklanmadıysa engelle
          if (!isModalContent && target === clickedElement) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }
      };

      // Tüm click event'lerini capture phase'de yakala
      document.addEventListener('click', handleClick, true);

      return () => {
        document.removeEventListener('click', handleClick, true);
      };
    }
  }, [allowBackdropClose]);

  return (
    <ModalContext.Provider value={{ allowBackdropClose }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  return context;
}

