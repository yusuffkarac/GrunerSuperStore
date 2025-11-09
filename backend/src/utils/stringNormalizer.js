/**
 * Almanca karakterleri normalize et
 * ß → ss, ü → ue, ö → oe, ä → ae
 */
export function normalizeGermanChars(str) {
  if (!str) return str;
  
  return str
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ü/g, 'ue')
    .replace(/ö/g, 'oe')
    .replace(/ä/g, 'ae')
    .replace(/Ü/g, 'Ue')
    .replace(/Ö/g, 'Oe')
    .replace(/Ä/g, 'Ae');
}

/**
 * Tersine normalize et (ss → ß, ue → ü, vb.)
 * Kullanıcı "uhlandstrase" yazdığında "uhlandstraße" olarak denemek için
 */
export function denormalizeGermanChars(str) {
  if (!str) return str;
  
  const lowerStr = str.toLowerCase();
  
  // Özel kelimeler: strasse → straße, strase → straße
  let result = lowerStr
    .replace(/strasse/g, 'straße')
    .replace(/strase/g, 'straße') // "uhlandstrase" → "uhlandstraße"
    .replace(/gasse/g, 'gaße')
    .replace(/weg/g, 'weg') // Weg değişmez
    .replace(/platz/g, 'platz'); // Platz değişmez
  
  // Genel ss → ß dönüşümü (özel kelimelerden sonra)
  result = result
    .replace(/([a-z])ss([a-z])/g, '$1ß$2') // ss → ß (iki harf arasında)
    .replace(/^ss([a-z])/g, 'ß$1') // Başta ss → ß
    .replace(/([a-z])ss$/g, '$1ß') // Sonda ss → ß
    .replace(/ue/g, 'ü')
    .replace(/oe/g, 'ö')
    .replace(/ae/g, 'ä');
  
  return result;
}

/**
 * String'i normalize et ve karşılaştırma için hazırla
 */
export function normalizeForSearch(str) {
  if (!str) return '';
  return normalizeGermanChars(str).trim();
}

