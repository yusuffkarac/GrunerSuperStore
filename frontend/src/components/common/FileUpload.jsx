import { useState, useRef, useEffect } from 'react';
import { FiUpload, FiX, FiImage, FiLoader, FiCrop, FiCheck, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import adminService from '../../services/adminService';
import { getCroppedImg } from '../../utils/imageUtils';

function FileUpload({
  value = [],
  onChange,
  multiple = false,
  folder = 'products',
  maxSize = 50 * 1024 * 1024, // 50MB
  accept = 'image/*',
  className = '',
  aspectRatio = null, // Opsiyonel: aspect ratio (örn: 1, 16/9, 4/3)
  minWidth = null,
  minHeight = null,
  enableCrop = true, // Crop özelliğini aktif/pasif yap
}) {
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropImageIndex, setCropImageIndex] = useState(null); // Hangi fotoğraf kırpılıyor
  const [draggedIndex, setDraggedIndex] = useState(null); // Sürüklenen elemanın index'i
  const [dragOverIndex, setDragOverIndex] = useState(null); // Üzerine gelinen elemanın index'i
  const [failedImages, setFailedImages] = useState(new Set()); // Yüklenemeyen resimlerin Set'i
  const fileInputRef = useRef(null);
  const pendingFilesRef = useRef([]);
  const originalUrlsRef = useRef({}); // Her fotoğraf için orijinal URL'leri sakla (index -> originalUrl)

  // Component mount olduğunda veya value değiştiğinde orijinal URL'leri sakla
  useEffect(() => {
    if (multiple) {
      const currentValue = Array.isArray(value) ? value : (value ? [value] : []);
      currentValue.forEach((url, index) => {
        // Eğer bu index için orijinal URL saklanmamışsa, mevcut URL'yi orijinal olarak sakla
        if (!originalUrlsRef.current[index]) {
          originalUrlsRef.current[index] = url;
          
        }
      });
    } else if (value) {
      // Single mode: eğer orijinal URL saklanmamışsa, mevcut value'yu orijinal olarak sakla
      if (!originalUrlsRef.current['single']) {
        originalUrlsRef.current['single'] = value;
        
      }
    }
  }, [value, multiple]);

  // Görsel boyutlarını kontrol et
  const checkImageDimensions = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        const needsCrop = 
          (aspectRatio && Math.abs(img.width / img.height - aspectRatio) > 0.01) ||
          (minWidth && img.width < minWidth) ||
          (minHeight && img.height < minHeight);
        
        resolve({
          needsCrop,
          width: img.width,
          height: img.height,
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ needsCrop: false });
      };
      
      img.src = url;
    });
  };

  const handleCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    if (!cropImage || !croppedAreaPixels) return;

    try {
      setUploading(true);
      const croppedFile = await getCroppedImg(cropImage, croppedAreaPixels);
      
      // Kırpılmış dosyayı yükle
      const response = multiple
        ? await adminService.uploadMultipleFiles([croppedFile], folder)
        : await adminService.uploadFile(croppedFile, folder);
      
      const uploadedUrl = multiple
        ? response.data.files[0].url
        : response.data.url;

      // API URL'sini tam URL'ye dönüştür
      const API_BASE = import.meta.env.VITE_API_URL 
        ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL.slice(0, -4) : import.meta.env.VITE_API_URL)
        : (import.meta.env.DEV ? 'http://localhost:5001' : '');
      const fullUrl = uploadedUrl.startsWith('http')
        ? uploadedUrl
        : uploadedUrl.startsWith('/uploads')
        ? `${API_BASE}${uploadedUrl}`
        : uploadedUrl;

      if (multiple) {
        const currentValue = Array.isArray(value) ? value : (value ? [value] : []);
        // Eğer belirli bir index'teki fotoğraf kırpıldıysa, o fotoğrafı değiştir
        if (cropImageIndex !== null && cropImageIndex >= 0 && cropImageIndex < currentValue.length) {
          const newValue = [...currentValue];
          // Orijinal URL'yi koru - eğer daha önce saklanmadıysa, handleManualCrop sırasında saklanmış olmalı
          // Ama burada da kontrol edelim ve saklayalım (güvenlik için)
          if (!originalUrlsRef.current[cropImageIndex]) {
            // İlk kırpma, mevcut value orijinal URL'dir (ama zaten kırpılmış olabilir)
            // Bu durumda orijinal URL'yi bulamayız, bu yüzden mevcut value'yu kullanırız
            console.warn('Orijinal URL bulunamadı, mevcut value kullanılıyor:', currentValue[cropImageIndex]);
            originalUrlsRef.current[cropImageIndex] = currentValue[cropImageIndex];
          }
          
          
          // Orijinal URL korunur, sadece value güncellenir
          newValue[cropImageIndex] = fullUrl; // Kırpılmış URL'yi value'ya yaz
          onChange(newValue);
        } else {
          // Yeni fotoğraf ekle
          const newIndex = currentValue.length;
          originalUrlsRef.current[newIndex] = fullUrl; // Yeni fotoğraf için orijinal URL = ilk yüklenen URL
          onChange([...currentValue, fullUrl]);
        }
      } else {
        // Single mode: orijinal URL'yi sakla
        if (!originalUrlsRef.current['single']) {
          // İlk kırpma, mevcut value orijinal URL'dir
          console.warn('Orijinal URL bulunamadı (single), mevcut value kullanılıyor:', value);
          originalUrlsRef.current['single'] = value || fullUrl;
        }
        
        
        // Orijinal URL korunur, sadece value güncellenir
        onChange(fullUrl);
      }

      toast.success('Bild erfolgreich zugeschnitten und hochgeladen');
      
      // Blob URL'i temizle
      if (cropImage && cropImage.startsWith('blob:')) {
        URL.revokeObjectURL(cropImage);
      }
      
      setCropping(false);
      setCropImage(null);
      setCropImageIndex(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } catch (error) {
      toast.error('Fehler beim Zuschneiden der Datei');
      console.error('Crop hatası:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    // Blob URL'i temizle
    if (cropImage && cropImage.startsWith('blob:')) {
      URL.revokeObjectURL(cropImage);
    }
    setCropping(false);
    setCropImage(null);
    setCropImageIndex(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    pendingFilesRef.current = [];
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    // Dosya boyutu kontrolü
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error(`Dateigröße darf maximal ${(maxSize / 1024 / 1024).toFixed(0)}MB betragen`);
      return;
    }

    // Dosya tipi kontrolü
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast.error('Nur Bilddateien können hochgeladen werden');
      return;
    }

    // Eğer crop aktifse ve aspect ratio/min boyutlar belirtilmişse kontrol et
    if (enableCrop && (aspectRatio || minWidth || minHeight) && files.length > 0) {
      const file = files[0];
      const dimensions = await checkImageDimensions(file);
      
      if (dimensions.needsCrop) {
        // Crop modal'ı aç
        const imageUrl = URL.createObjectURL(file);
        setCropImage(imageUrl);
        setCropping(true);
        pendingFilesRef.current = files;
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
    }

    // Normal yükleme
    setUploading(true);

    try {
      let uploadedUrls = [];

      if (multiple) {
        const response = await adminService.uploadMultipleFiles(files, folder);
        uploadedUrls = response.data.files.map(file => file.url);
      } else {
        const file = files[0];
        const response = await adminService.uploadFile(file, folder);
        uploadedUrls = [response.data.url];
      }

      // API URL'sini tam URL'ye dönüştür
      const API_BASE = import.meta.env.VITE_API_URL 
        ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL.slice(0, -4) : import.meta.env.VITE_API_URL)
        : (import.meta.env.DEV ? 'http://localhost:5001' : '');
      const fullUrls = uploadedUrls.map(url => {
        if (url.startsWith('http')) return url;
        if (url.startsWith('/uploads')) {
          return `${API_BASE}${url}`;
        }
        return url;
      });

      if (multiple) {
        const currentValue = Array.isArray(value) ? value : (value ? [value] : []);
        // Yeni fotoğraflar için orijinal URL'leri sakla
        fullUrls.forEach((url, i) => {
          const newIndex = currentValue.length + i;
          originalUrlsRef.current[newIndex] = url;
        });
        onChange([...currentValue, ...fullUrls]);
      } else {
        // Single mode: orijinal URL'yi sakla
        originalUrlsRef.current['single'] = fullUrls[0];
        onChange(fullUrls[0]);
      }

      toast.success(`${files.length} ${files.length === 1 ? 'Datei' : 'Dateien'} erfolgreich hochgeladen`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Hochladen der Datei(en)');
      console.error('Dosya yükleme hatası:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualCrop = async (url, index = null) => {
    if (!enableCrop) return;
    
    try {
      // Orijinal URL'yi bul
      let originalUrl = url;
      if (index !== null) {
        // Multiple mode
        if (originalUrlsRef.current[index]) {
          originalUrl = originalUrlsRef.current[index];
          
        } else {
          // Orijinal URL saklanmamış, mevcut URL'yi orijinal olarak kullan
          // (Bu durumda ilk kırpma olabilir, mevcut URL orijinaldir)
          originalUrl = url;
          
          // İlk kırpma için orijinal URL'yi sakla
          originalUrlsRef.current[index] = url;
        }
      } else {
        // Single mode
        if (originalUrlsRef.current['single']) {
          originalUrl = originalUrlsRef.current['single'];
          
        } else {
          // Orijinal URL saklanmamış, mevcut URL'yi orijinal olarak kullan
          originalUrl = url;
          
          // İlk kırpma için orijinal URL'yi sakla
          originalUrlsRef.current['single'] = url;
        }
      }
      
      
      
      
      // URL'yi normalize et
      const getApiBase = () => {
        if (import.meta.env.VITE_API_URL) {
          const url = import.meta.env.VITE_API_URL;
          return url.endsWith('/api') ? url.slice(0, -4) : url;
        }
        return import.meta.env.DEV ? 'http://localhost:5001' : '';
      };
      const normalizedUrl = originalUrl.startsWith('http') ? originalUrl : 
        originalUrl.startsWith('/uploads') ? `${getApiBase()}${originalUrl}` : originalUrl;
      
      
      
      // Önce görselin yüklenip yüklenmediğini kontrol et
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => {
          
          resolve();
        };
        img.onerror = (error) => {
          console.error('Görsel yüklenemedi:', error);
          reject(new Error('Görsel yüklenemedi'));
        };
        img.crossOrigin = 'anonymous';
        img.src = normalizedUrl;
      });
      
      // Görsel yüklendiyse blob URL oluştur
      const response = await fetch(normalizedUrl, {
        mode: 'cors',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      
      
      setCropImage(blobUrl);
      setCropImageIndex(index); // Hangi fotoğraf kırpılıyor
      setCropping(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } catch (error) {
      console.error('Crop görseli yükleme hatası:', error);
      toast.error('Görsel yüklenirken bir hata oluştu. Direkt URL deneniyor...');
      // Fallback: direkt URL kullan (crossOrigin ile)
      // Orijinal URL'yi kullan (yukarıda belirlenmiş originalUrl)
      let originalUrl = url;
      if (index !== null) {
        originalUrl = originalUrlsRef.current[index] || url;
        if (!originalUrlsRef.current[index]) {
          originalUrlsRef.current[index] = url;
        }
      } else {
        originalUrl = originalUrlsRef.current['single'] || url;
        if (!originalUrlsRef.current['single']) {
          originalUrlsRef.current['single'] = url;
        }
      }
      
      const normalizedUrl = originalUrl.startsWith('http') ? originalUrl : 
        originalUrl.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${originalUrl}` : originalUrl;
      
      setCropImage(normalizedUrl);
      setCropImageIndex(index); // Hangi fotoğraf kırpılıyor
      setCropping(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  };

  const handleMoveUp = (index) => {
    if (!multiple || !Array.isArray(value) || index === 0) return;
    
    const newValue = [...value];
    const newOriginalUrls = { ...originalUrlsRef.current };
    
    // Array'de yer değiştir
    [newValue[index - 1], newValue[index]] = [newValue[index], newValue[index - 1]];
    
    // Orijinal URL'leri de yer değiştir
    [newOriginalUrls[index - 1], newOriginalUrls[index]] = [
      newOriginalUrls[index],
      newOriginalUrls[index - 1],
    ];
    
    originalUrlsRef.current = newOriginalUrls;
    onChange(newValue);
  };

  const handleMoveDown = (index) => {
    if (!multiple || !Array.isArray(value) || index === value.length - 1) return;
    
    const newValue = [...value];
    const newOriginalUrls = { ...originalUrlsRef.current };
    
    // Array'de yer değiştir
    [newValue[index], newValue[index + 1]] = [newValue[index + 1], newValue[index]];
    
    // Orijinal URL'leri de yer değiştir
    [newOriginalUrls[index], newOriginalUrls[index + 1]] = [
      newOriginalUrls[index + 1],
      newOriginalUrls[index],
    ];
    
    originalUrlsRef.current = newOriginalUrls;
    onChange(newValue);
  };

  const handleRemove = (index) => {
    if (multiple && Array.isArray(value)) {
      const removedUrl = value[index];
      const newValue = value.filter((_, i) => i !== index);

      // Failed images'dan da kaldır
      setFailedImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(removedUrl);
        return newSet;
      });

      // Orijinal URL referansını da temizle
      delete originalUrlsRef.current[index];
      // İndeksleri yeniden düzenle
      const newOriginalUrls = {};
      Object.keys(originalUrlsRef.current).forEach((key) => {
        const keyIndex = parseInt(key);
        if (!isNaN(keyIndex)) {
          if (keyIndex < index) {
            newOriginalUrls[keyIndex] = originalUrlsRef.current[keyIndex];
          } else if (keyIndex > index) {
            newOriginalUrls[keyIndex - 1] = originalUrlsRef.current[keyIndex];
          }
        }
      });
      originalUrlsRef.current = newOriginalUrls;
      onChange(newValue);
    } else {
      // Failed images'dan da kaldır
      setFailedImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(value);
        return newSet;
      });

      delete originalUrlsRef.current['single'];
      onChange('');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Drag and Drop handlers
  const handleDragStart = (e, index) => {
    if (!multiple) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  const handleDragOver = (e, index) => {
    if (!multiple || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverIndex(null);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (!multiple || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newValue = [...value];
    const newOriginalUrls = { ...originalUrlsRef.current };

    // Elemanı sürüklenen pozisyondan çıkar ve yeni pozisyona ekle
    const [draggedItem] = newValue.splice(draggedIndex, 1);
    newValue.splice(dropIndex, 0, draggedItem);

    // Orijinal URL'leri de aynı şekilde yeniden düzenle
    const draggedOriginalUrl = newOriginalUrls[draggedIndex];
    const reorderedOriginalUrls = {};
    
    // Yeni sıralamaya göre orijinal URL'leri yeniden map et
    newValue.forEach((url, newIndex) => {
      // Eski array'de bu URL'nin index'ini bul
      const oldIndex = value.findIndex((oldUrl) => oldUrl === url);
      if (oldIndex !== -1 && newOriginalUrls[oldIndex]) {
        reorderedOriginalUrls[newIndex] = newOriginalUrls[oldIndex];
      } else if (oldIndex === draggedIndex) {
        // Sürüklenen eleman için orijinal URL'yi kullan
        reorderedOriginalUrls[newIndex] = draggedOriginalUrl || url;
      } else {
        // Fallback: mevcut URL'yi orijinal olarak kullan
        reorderedOriginalUrls[newIndex] = url;
      }
    });
    
    originalUrlsRef.current = reorderedOriginalUrls;
    onChange(newValue);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Dosya input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading || cropping}
      />

      {/* Yükleme butonu */}
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading || cropping}
        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
      >
        {uploading ? (
          <>
            <FiLoader className="animate-spin text-green-600" size={20} />
            <span className="text-gray-600">Wird hochgeladen...</span>
          </>
        ) : (
          <>
            <FiUpload className="text-gray-600" size={20} />
            <span className="text-gray-600">
              {multiple ? 'Dateien auswählen' : 'Datei auswählen'}
            </span>
          </>
        )}
      </button>

      {/* Yüklenen dosyalar */}
      {value && (
        <div className="space-y-2">
          {Array.isArray(value) ? (
            value.map((url, index) => (
              <div
                key={index}
                draggable={multiple && value.length > 1}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                  draggedIndex === index
                    ? 'bg-blue-100 opacity-50 cursor-grabbing'
                    : dragOverIndex === index
                    ? 'bg-blue-50 border-2 border-blue-300 border-dashed'
                    : 'bg-gray-50 cursor-grab'
                }`}
              >
                {/* Drag handle - sadece multiple mode'da ve birden fazla fotoğraf varsa */}
                {multiple && value.length > 1 && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-0.5 text-gray-400 cursor-grab active:cursor-grabbing" title="Zum Verschieben ziehen">
                      <div className="flex flex-col gap-0.5">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      </div>
                    </div>
                    {/* Sıralama butonları - alternatif olarak */}
                    <div className="flex flex-col gap-1 mt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveUp(index);
                        }}
                        disabled={index === 0}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Nach oben verschieben"
                      >
                        <FiChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveDown(index);
                        }}
                        disabled={index === value.length - 1}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Nach unten verschieben"
                      >
                        <FiChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                )}
                <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {failedImages.has(url) ? (
                    <FiImage className="text-gray-400" size={20} />
                  ) : (
                    <img
                      src={url}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={() => {
                        setFailedImages(prev => new Set([...prev, url]));
                      }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 truncate">{url}</p>
                  {multiple && (
                    <p className="text-xs text-gray-400 mt-0.5">Position: {index + 1}</p>
                  )}
                </div>
                {enableCrop && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManualCrop(url, index);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Bild zuschneiden"
                  >
                    <FiCrop size={18} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Entfernen"
                >
                  <FiX size={18} />
                </button>
              </div>
            ))
          ) : value ? (
            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                {failedImages.has(value) ? (
                  <FiImage className="text-gray-400" size={20} />
                ) : (
                  <img
                    src={value}
                    alt="Upload"
                    className="w-full h-full object-cover"
                    onError={() => {
                      setFailedImages(prev => new Set([...prev, value]));
                    }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 truncate">{value}</p>
              </div>
              {enableCrop && (
                <button
                  type="button"
                  onClick={() => handleManualCrop(value, null)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Bild zuschneiden"
                >
                  <FiCrop size={18} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemove(0)}
                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Crop Modal */}
      {cropping && cropImage && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Bild zuschneiden</h3>
            </div>
            <div className="relative w-full bg-gray-900" style={{ height: '500px', flexShrink: 0 }}>
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio || undefined}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                restrictPosition={true}
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                  },
                  cropAreaStyle: {
                    border: '2px solid #fff',
                  },
                }}
              />
            </div>
            <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <label className="text-sm text-gray-700">
                  Zoom:
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="ml-2 w-32"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCropCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleCropSave}
                  disabled={uploading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <FiLoader className="animate-spin" size={16} />
                      Wird hochgeladen...
                    </>
                  ) : (
                    <>
                      <FiCheck size={16} />
                      Speichern
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bilgi metni */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
        <div className="flex items-start gap-2">
          <FiImage className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-blue-900">
              Empfohlene Bildanforderungen:
            </p>
            <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
              <li>
                <strong>Format:</strong> JPEG, PNG, GIF, WEBP
              </li>
              <li>
                <strong>Maximale Größe:</strong> {(maxSize / 1024 / 1024).toFixed(0)}MB
              </li>
              <li>
                <strong>Empfohlene Auflösung:</strong> 
                {minWidth && minHeight ? (
                  <span> Mindestens {minWidth}x{minHeight}px, optimal {Math.max(minWidth, 1200)}x{Math.max(minHeight, 1200)}px oder höher</span>
                ) : aspectRatio ? (
                  aspectRatio === 1 ? (
                    <span> Mindestens 800x800px, optimal 1200x1200px oder höher (Quadratisch)</span>
                  ) : aspectRatio === 16/9 ? (
                    <span> Mindestens 1280x720px, optimal 1920x1080px oder höher (16:9)</span>
                  ) : aspectRatio === 4/3 ? (
                    <span> Mindestens 1024x768px, optimal 1600x1200px oder höher (4:3)</span>
                  ) : (
                    <span> Mindestens 1200px Breite oder Höhe, optimal 2000px oder höher</span>
                  )
                ) : (
                  <span> Mindestens 800x800px, optimal 1200x1200px oder höher für beste Qualität</span>
                )}
              </li>
              {aspectRatio && (
                <li>
                  <strong>Seitenverhältnis:</strong> {aspectRatio === 1 ? '1:1 (Quadratisch)' : aspectRatio === 16/9 ? '16:9 (Breitformat)' : aspectRatio === 4/3 ? '4:3 (Standard)' : `${aspectRatio}`}
                </li>
              )}
              {minWidth && minHeight && (
                <li>
                  <strong>Mindestgröße:</strong> {minWidth}x{minHeight}px (Diese Größe wird automatisch erzwungen)
                </li>
              )}
             
             
            </ul>
            {aspectRatio && (
              <p className="text-xs text-blue-700 mt-2 italic">
                💡 Tipp: Das Bild wird automatisch auf das richtige Seitenverhältnis zugeschnitten, falls erforderlich.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FileUpload;
