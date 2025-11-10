import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScanType } from 'html5-qrcode';
import { FiX, FiCamera } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const BarcodeScanner = ({ isOpen, onClose, onScan, title = 'Barkod Okutun', keepOpen = false }) => {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState(null);

  useEffect(() => {
    if (isOpen && !html5QrCodeRef.current) {
      setScannedBarcode(null); // Yeni tarama başladığında temizle
      startScanning();
    } else if (!isOpen && html5QrCodeRef.current) {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startScanning = async () => {
    try {
      setError(null);
      setScanning(true);

      // Mobil cihaz kontrolü
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      console.log('Mobil cihaz:', isMobile);

      // Html5Qrcode instance oluştur
      const html5QrCode = new Html5Qrcode('barcode-scanner');
      html5QrCodeRef.current = html5QrCode;

      // Mobil ve desktop için farklı ayarlar
      const config = {
        fps: isMobile ? 5 : 10, // Mobilde daha düşük FPS
        qrbox: function(viewfinderWidth, viewfinderHeight) {
          // Mobil için daha küçük, desktop için daha büyük
          const minEdgePercentage = isMobile ? 0.7 : 0.8;
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          return {
            width: qrboxSize,
            height: qrboxSize
          };
        },
        aspectRatio: 1.0,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      };

      let cameraStarted = false;
      let lastError = null;

      // Mobil cihazlarda önce facingMode ile dene (daha güvenilir)
      if (isMobile) {
        const cameraConfigs = [
          { facingMode: 'environment' }, // Arka kamera
          { facingMode: 'user' }, // Ön kamera
        ];

        for (const cameraConfig of cameraConfigs) {
          try {
            console.log('Mobil kamera deneniyor:', cameraConfig.facingMode);
            await html5QrCode.start(
              cameraConfig,
              config,
              (decodedText, decodedResult) => {
                if (decodedText === lastScannedCode) {
                  return;
                }
                setLastScannedCode(decodedText);
                setScannedBarcode(decodedText);
                if (onScan) {
                  onScan(decodedText);
                  // Eğer keepOpen false ise popup'ı kapat
                  if (!keepOpen) {
                    stopScanning();
                    onClose();
                  }
                }
              },
              (errorMessage) => {
                // Mobilde hata mesajlarını logla ama durdurma
                if (errorMessage && !errorMessage.includes('No QR code')) {
                  console.log('Tarama hatası (normal):', errorMessage);
                }
              }
            );
            cameraStarted = true;
            console.log('Mobil kamera başarıyla başlatıldı:', cameraConfig.facingMode);
            break;
          } catch (cameraError) {
            console.error(`Mobil kamera başlatma hatası (${cameraConfig.facingMode}):`, cameraError);
            lastError = cameraError;
            continue;
          }
        }
      } else {
        // Desktop için kamera listesi ile dene
        try {
          const devices = await Html5Qrcode.getCameras();
          console.log('Mevcut kameralar:', devices);
          
          const backCamera = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          );

          const cameraConfigs = [];
          if (backCamera) {
            cameraConfigs.push(backCamera.id);
          }
          devices.forEach(device => {
            if (!cameraConfigs.includes(device.id)) {
              cameraConfigs.push(device.id);
            }
          });

          if (cameraConfigs.length === 0) {
            cameraConfigs.push({ facingMode: 'environment' });
            cameraConfigs.push({ facingMode: 'user' });
          }

          for (const cameraIdOrConfig of cameraConfigs) {
            try {
              await html5QrCode.start(
                cameraIdOrConfig,
                config,
                (decodedText, decodedResult) => {
                  if (decodedText === lastScannedCode) {
                    return;
                  }
                  setLastScannedCode(decodedText);
                  if (onScan) {
                    onScan(decodedText);
                    stopScanning();
                    onClose();
                  }
                },
                () => {}
              );
              cameraStarted = true;
              break;
            } catch (cameraError) {
              console.log(`Desktop kamera başlatma denemesi başarısız:`, cameraError);
              lastError = cameraError;
              continue;
            }
          }
        } catch (deviceError) {
          console.log('Kamera listesi alınamadı, facingMode ile deniyoruz:', deviceError);
          const cameraConfigs = [
            { facingMode: 'environment' },
            { facingMode: 'user' },
          ];

          for (const cameraConfig of cameraConfigs) {
            try {
              await html5QrCode.start(
                cameraConfig,
                config,
                (decodedText, decodedResult) => {
                  if (decodedText === lastScannedCode) {
                    return;
                  }
                  setLastScannedCode(decodedText);
                  if (onScan) {
                    onScan(decodedText);
                    stopScanning();
                    onClose();
                  }
                },
                () => {}
              );
              cameraStarted = true;
              break;
            } catch (cameraError) {
              lastError = cameraError;
              continue;
            }
          }
        }
      }

      if (!cameraStarted) {
        let errorMsg = 'Kamera başlatılamadı.';
        
        if (lastError) {
          if (lastError.name === 'NotAllowedError') {
            errorMsg = 'Kamera erişim izni verilmedi. Lütfen tarayıcı ayarlarından kamera iznini açın.';
          } else if (lastError.name === 'NotFoundError') {
            errorMsg = 'Kamera bulunamadı. Lütfen cihazınızda bir kamera olduğundan emin olun.';
          } else if (lastError.name === 'NotReadableError') {
            errorMsg = 'Kamera kullanılamıyor. Başka bir uygulama kamera kullanıyor olabilir.';
          } else if (lastError.message) {
            errorMsg = `Kamera hatası: ${lastError.message}`;
          }
        }
        
        if (isMobile) {
          errorMsg += ' Mobil cihazlarda HTTPS bağlantısı gerekebilir.';
        }
        
        setError(errorMsg);
        setScanning(false);
        console.error('Kamera başlatılamadı:', lastError);
      }
    } catch (err) {
      console.error('Kamera başlatma hatası:', err);
      let errorMsg = 'Kamera başlatılamadı';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Kamera erişim izni verilmedi. Lütfen tarayıcı ayarlarından kamera iznini açın.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Kamera bulunamadı. Lütfen cihazınızda bir kamera olduğundan emin olun.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Kamera kullanılamıyor. Başka bir uygulama kamera kullanıyor olabilir.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Kamera durdurma hatası:', err);
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
    setLastScannedCode(null);
    // scannedBarcode'u temizleme - kullanıcı görmek isteyebilir
  };

  const handleClose = () => {
    stopScanning();
    setScannedBarcode(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 flex flex-col"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiCamera className="w-5 h-5" />
              {title}
            </h3>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Scanner Area */}
          <div className="flex-1 p-4 flex flex-col items-center justify-center">
            {error ? (
              <div className="text-center space-y-4">
                <div className="text-red-600 text-sm mb-2">{error}</div>
                <div className="text-xs text-gray-500 mb-4">
                  <p>• Tarayıcı ayarlarından kamera iznini kontrol edin</p>
                  <p>• Başka bir uygulama kamera kullanıyor olabilir</p>
                  <p>• Sayfayı yenileyip tekrar deneyin</p>
                </div>
                <button
                  onClick={() => {
                    setError(null);
                    stopScanning();
                    setTimeout(() => {
                      startScanning();
                    }, 500);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Tekrar Dene
                </button>
              </div>
            ) : (
              <div className="w-full space-y-4">
                <div
                  id="barcode-scanner"
                  className="w-full rounded-lg overflow-hidden bg-black"
                  style={{ minHeight: '300px' }}
                />
                {scanning && !scannedBarcode && (
                  <p className="text-center text-sm text-gray-600">
                    Barkodu kameraya tutun...
                  </p>
                )}
                {scannedBarcode && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-700 font-medium mb-1">Okunan Barkod:</p>
                    <p className="text-lg font-bold text-green-900 font-mono">{scannedBarcode}</p>
                    {keepOpen && (
                      <p className="text-xs text-green-600 mt-2">
                        Başka bir barkod okutabilirsiniz veya popup'ı kapatabilirsiniz.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              İptal
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BarcodeScanner;

