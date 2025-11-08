/**
 * OpenFoodFacts verisini Product modeline dönüştürme fonksiyonları
 */

/**
 * OpenFoodFacts ürün verisini Product modeline dönüştür
 * @param {Object} offProduct - OpenFoodFacts API'den gelen ürün verisi
 * @returns {Object} Product modeline uygun veri objesi
 */
export function mapOpenFoodFactsToProduct(offProduct) {
  if (!offProduct) {
    return null;
  }

  const mappedData = {};

  // 1. İçerik bilgisi (ingredients_text)
  if (offProduct.ingredients_text || offProduct.ingredients_text_en) {
    mappedData.ingredientsText =
      offProduct.ingredients_text_en || offProduct.ingredients_text || null;
  }

  // 2. Alerjen bilgileri (allergens_tags)
  if (offProduct.allergens_tags && Array.isArray(offProduct.allergens_tags)) {
    // "en:peanuts" formatından "peanuts" formatına çevir
    mappedData.allergens = offProduct.allergens_tags.map((tag) => {
      // "en:peanuts" -> "peanuts" veya "en:sesame-seeds" -> "sesame-seeds"
      return tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');
    });
  } else {
    mappedData.allergens = [];
  }

  // 3. Nutri-Score (nutriscore_grade)
  if (offProduct.nutriscore_grade) {
    const grade = offProduct.nutriscore_grade.toLowerCase();
    if (['a', 'b', 'c', 'd', 'e'].includes(grade)) {
      mappedData.nutriscoreGrade = grade;
    }
  }

  // 4. Eco-Score (ecoscore_grade)
  if (offProduct.ecoscore_grade) {
    const grade = offProduct.ecoscore_grade.toLowerCase();
    if (['a', 'b', 'c', 'd', 'e'].includes(grade)) {
      mappedData.ecoscoreGrade = grade;
    }
  }

  // 5. Beslenme bilgileri (nutriments)
  if (offProduct.nutriments && typeof offProduct.nutriments === 'object') {
    // Sadece önemli beslenme bilgilerini al
    const nutritionData = {};
    
    // Enerji (kalori)
    if (offProduct.nutriments['energy-kcal_100g'] !== undefined) {
      nutritionData.energyKcal = offProduct.nutriments['energy-kcal_100g'];
    }
    if (offProduct.nutriments['energy-kcal_unit']) {
      nutritionData.energyKcalUnit = offProduct.nutriments['energy-kcal_unit'];
    }

    // Protein
    if (offProduct.nutriments.proteins_100g !== undefined) {
      nutritionData.proteins = offProduct.nutriments.proteins_100g;
    }
    if (offProduct.nutriments.proteins_unit) {
      nutritionData.proteinsUnit = offProduct.nutriments.proteins_unit;
    }

    // Karbonhidrat
    if (offProduct.nutriments.carbohydrates_100g !== undefined) {
      nutritionData.carbohydrates = offProduct.nutriments.carbohydrates_100g;
    }
    if (offProduct.nutriments.carbohydrates_unit) {
      nutritionData.carbohydratesUnit = offProduct.nutriments.carbohydrates_unit;
    }

    // Şeker
    if (offProduct.nutriments.sugars_100g !== undefined) {
      nutritionData.sugars = offProduct.nutriments.sugars_100g;
    }
    if (offProduct.nutriments.sugars_unit) {
      nutritionData.sugarsUnit = offProduct.nutriments.sugars_unit;
    }

    // Yağ
    if (offProduct.nutriments.fat_100g !== undefined) {
      nutritionData.fat = offProduct.nutriments.fat_100g;
    }
    if (offProduct.nutriments.fat_unit) {
      nutritionData.fatUnit = offProduct.nutriments.fat_unit;
    }

    // Doymuş yağ
    if (offProduct.nutriments['saturated-fat_100g'] !== undefined) {
      nutritionData.saturatedFat = offProduct.nutriments['saturated-fat_100g'];
    }
    if (offProduct.nutriments['saturated-fat_unit']) {
      nutritionData.saturatedFatUnit = offProduct.nutriments['saturated-fat_unit'];
    }

    // Tuz
    if (offProduct.nutriments.salt_100g !== undefined) {
      nutritionData.salt = offProduct.nutriments.salt_100g;
    }
    if (offProduct.nutriments.salt_unit) {
      nutritionData.saltUnit = offProduct.nutriments.salt_unit;
    }

    // Lif
    if (offProduct.nutriments.fiber_100g !== undefined) {
      nutritionData.fiber = offProduct.nutriments.fiber_100g;
    }
    if (offProduct.nutriments.fiber_unit) {
      nutritionData.fiberUnit = offProduct.nutriments.fiber_unit;
    }

    // Sodyum
    if (offProduct.nutriments.sodium_100g !== undefined) {
      nutritionData.sodium = offProduct.nutriments.sodium_100g;
    }
    if (offProduct.nutriments.sodium_unit) {
      nutritionData.sodiumUnit = offProduct.nutriments.sodium_unit;
    }

    // Sadece boş değilse ekle
    if (Object.keys(nutritionData).length > 0) {
      mappedData.nutritionData = nutritionData;
    }
  }

  // 6. OpenFoodFacts kategorileri (categories_tags)
  if (
    offProduct.categories_tags &&
    Array.isArray(offProduct.categories_tags)
  ) {
    mappedData.openfoodfactsCategories = offProduct.categories_tags.map(
      (tag) => {
        // "en:plant-based-foods-and-beverages" -> "plant-based-foods-and-beverages"
        return tag.replace(/^[a-z]{2}:/, '');
      }
    );
  }

  return mappedData;
}

/**
 * Sadece mevcut olmayan alanları güncelle (mevcut veriyi koru)
 * @param {Object} existingProduct - Mevcut ürün verisi
 * @param {Object} offData - OpenFoodFacts'ten gelen veri
 * @returns {Object} Güncellenmiş veri objesi
 */
export function mergeOpenFoodFactsData(existingProduct, offData) {
  const updateData = {};

  // Sadece boş/null olan alanları güncelle
  if (!existingProduct.ingredientsText && offData.ingredientsText) {
    updateData.ingredientsText = offData.ingredientsText;
  }

  if (
    (!existingProduct.allergens ||
      (Array.isArray(existingProduct.allergens) &&
        existingProduct.allergens.length === 0)) &&
    offData.allergens &&
    Array.isArray(offData.allergens) &&
    offData.allergens.length > 0
  ) {
    updateData.allergens = offData.allergens;
  }

  if (!existingProduct.nutriscoreGrade && offData.nutriscoreGrade) {
    updateData.nutriscoreGrade = offData.nutriscoreGrade;
  }

  if (!existingProduct.ecoscoreGrade && offData.ecoscoreGrade) {
    updateData.ecoscoreGrade = offData.ecoscoreGrade;
  }

  if (!existingProduct.nutritionData && offData.nutritionData) {
    updateData.nutritionData = offData.nutritionData;
  }

  if (
    (!existingProduct.openfoodfactsCategories ||
      (Array.isArray(existingProduct.openfoodfactsCategories) &&
        existingProduct.openfoodfactsCategories.length === 0)) &&
    offData.openfoodfactsCategories &&
    Array.isArray(offData.openfoodfactsCategories) &&
    offData.openfoodfactsCategories.length > 0
  ) {
    updateData.openfoodfactsCategories = offData.openfoodfactsCategories;
  }

  return updateData;
}

