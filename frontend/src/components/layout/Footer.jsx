import { Link } from 'react-router-dom';

// Footer Componenti
function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
      <div className="container-mobile py-8">
        {/* Logo ve açıklama */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-primary-700 mb-2">Gruner SuperStore</h2>
          <p className="text-sm text-gray-600">
            Online-Bestellung für Ihre Lieblings-Lebensmittel
          </p>
        </div>

        {/* Linkler */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Schnelllinks</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/urunler" className="text-gray-600 hover:text-primary-700">
                  Produkte
                </Link>
              </li>
              <li>
                <Link to="/favorilerim" className="text-gray-600 hover:text-primary-700">
                  Favoriten
                </Link>
              </li>
              <li>
                <Link to="/siparislerim" className="text-gray-600 hover:text-primary-700">
                  Bestellungen
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Konto</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/profil" className="text-gray-600 hover:text-primary-700">
                  Profil
                </Link>
              </li>
              <li>
                <Link to="/giris" className="text-gray-600 hover:text-primary-700">
                  Anmelden
                </Link>
              </li>
              <li>
                <Link to="/kayit" className="text-gray-600 hover:text-primary-700">
                  Registrieren
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
          <p>&copy; 2025 Gruner SuperStore. Alle Rechte vorbehalten.</p>
        </div>
      </div>

      {/* Bottom Nav için boşluk (mobil) */}
      <div className="h-16 md:hidden"></div>
    </footer>
  );
}

export default Footer;
