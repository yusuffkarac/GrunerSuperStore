/**
 * Şehir eşleştirme yardımcı fonksiyonları
 * Yazım hatalarına toleranslı şehir eşleştirme
 */

/**
 * Levenshtein distance hesapla (iki string arasındaki fark)
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} Distance (0 = aynı, daha yüksek = daha farklı)
 */
function levenshteinDistance(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

/**
 * İki string'in benzerlik oranını hesapla (0-1 arası, 1 = tamamen aynı)
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} Similarity score (0-1)
 */
function similarity(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLength;
}

/**
 * Şehir listesinden en yakın eşleşmeyi bul
 * @param {string} inputCity - Kullanıcının girdiği şehir
 * @param {Array<string>} allowedCities - İzin verilen şehirler listesi
 * @param {number} threshold - Minimum benzerlik oranı (0-1, varsayılan 0.7)
 * @returns {string|null} En yakın eşleşen şehir veya null
 */
function findBestMatch(inputCity, allowedCities, threshold = 0.7) {
  if (!inputCity || !allowedCities || allowedCities.length === 0) {
    return null;
  }

  const normalizedInput = inputCity.toLowerCase().trim();
  
  // Önce tam eşleşme kontrolü
  const exactMatch = allowedCities.find(
    city => city.toLowerCase().trim() === normalizedInput
  );
  if (exactMatch) {
    return exactMatch;
  }

  // Fuzzy matching ile en yakın eşleşmeyi bul
  let bestMatch = null;
  let bestScore = 0;

  for (const city of allowedCities) {
    const normalizedCity = city.toLowerCase().trim();
    const score = similarity(normalizedInput, normalizedCity);
    
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = city;
    }
  }

  return bestMatch;
}

/**
 * Şehir listesinden eşleşen şehirleri bul (birden fazla şehir için)
 * @param {string} inputCity - Kullanıcının girdiği şehir
 * @param {Array<string>} allowedCities - İzin verilen şehirler listesi
 * @param {number} threshold - Minimum benzerlik oranı (0-1, varsayılan 0.7)
 * @returns {Array<string>} Eşleşen şehirler
 */
function findMatches(inputCity, allowedCities, threshold = 0.7) {
  if (!inputCity || !allowedCities || allowedCities.length === 0) {
    return [];
  }

  const normalizedInput = inputCity.toLowerCase().trim();
  const matches = [];

  for (const city of allowedCities) {
    const normalizedCity = city.toLowerCase().trim();
    
    // Tam eşleşme
    if (normalizedCity === normalizedInput) {
      matches.push(city);
      continue;
    }

    // Fuzzy matching
    const score = similarity(normalizedInput, normalizedCity);
    if (score >= threshold) {
      matches.push(city);
    }
  }

  return matches;
}

/**
 * Şehir adres sonuçlarında eşleşme kontrolü yap
 * @param {string} itemCity - Adres sonucundaki şehir
 * @param {Array<string>} allowedCities - İzin verilen şehirler listesi
 * @param {number} threshold - Minimum benzerlik oranı (0-1, varsayılan 0.7)
 * @returns {boolean} Eşleşme var mı?
 */
function isCityMatch(itemCity, allowedCities, threshold = 0.7) {
  if (!itemCity || !allowedCities || allowedCities.length === 0) {
    return false;
  }

  const normalizedItemCity = itemCity.toLowerCase().trim();

  for (const allowedCity of allowedCities) {
    const normalizedAllowedCity = allowedCity.toLowerCase().trim();
    
    // Tam eşleşme
    if (normalizedItemCity === normalizedAllowedCity) {
      return true;
    }

    // Fuzzy matching
    const score = similarity(normalizedItemCity, normalizedAllowedCity);
    if (score >= threshold) {
      return true;
    }
  }

  return false;
}

export {
  levenshteinDistance,
  similarity,
  findBestMatch,
  findMatches,
  isCityMatch,
};

