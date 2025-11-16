import { createContext, useContext, useState } from 'react';

const CookieConsentContext = createContext(null);

export function CookieConsentProvider({ children }) {
  const [showSettings, setShowSettings] = useState(false);

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  return (
    <CookieConsentContext.Provider value={{ showSettings, openSettings, closeSettings }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return context;
}

