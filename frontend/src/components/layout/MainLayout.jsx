import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import useAuthStore from '../../store/authStore';
import useFavoriteStore from '../../store/favoriteStore';

// Ana Layout - Header, Content, Footer, BottomNav
function MainLayout() {
  const { isAuthenticated } = useAuthStore();
  const { loadFavoriteIds } = useFavoriteStore();

  // Kullanıcı giriş yaptığında favori durumunu yükle
  useEffect(() => {
    if (isAuthenticated) {
      loadFavoriteIds();
    }
  }, [isAuthenticated, loadFavoriteIds]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 pb-4">
        <Outlet />
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}

export default MainLayout;
