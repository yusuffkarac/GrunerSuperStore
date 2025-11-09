// Sayfa geçişlerinde gösterilecek tam ekran loading animasyonu
function PageLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 animate-blur-fade-in">
      <div className="flex flex-col items-center gap-6">
        {/* Ana spinner - daha büyük ve gradient */}
        <div className="relative">
          <div className="w-20 h-20 border-4 border-primary-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary-700 border-t-transparent rounded-full animate-spin-scale"></div>
        </div>
        
        {/* Nokta animasyonu */}
        <div className="flex items-center gap-2">
          <span className="text-primary-700 font-semibold text-lg">Lädelt</span>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-primary-700 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '1.4s' }}></div>
            <div className="w-2 h-2 bg-primary-700 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '1.4s' }}></div>
            <div className="w-2 h-2 bg-primary-700 rounded-full animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '1.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PageLoading;

