import { useModal } from '../contexts/ModalContext';

/**
 * Modal backdrop click handler hook
 * Context'teki allowBackdropClose ayarına göre backdrop click davranışını kontrol eder
 */
export function useModalBackdrop(onClose) {
  const { allowBackdropClose } = useModal();

  const handleBackdropClick = (e) => {
    // Sadece backdrop'a (modal dışına) tıklandığında ve allowBackdropClose true ise kapat
    if (e.target === e.currentTarget && allowBackdropClose && onClose) {
      onClose();
    }
  };

  return handleBackdropClick;
}

