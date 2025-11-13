/**
 * Category Helper Utilities
 * Handles different category data formats
 */

/**
 * Normalize categories to array of IDs
 * Handles both formats:
 * - Array of strings: ['cat-1', 'cat-2']
 * - Array of objects: [{categoryId: 'cat-1', maxParticipants: 10}, ...]
 */
export const normalizeCategoryIds = (categories) => {
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return [];
  }

  // Check if first item is an object or string
  if (typeof categories[0] === 'object' && categories[0] !== null) {
    return categories.map(cat => cat.categoryId || cat.id).filter(Boolean);
  }

  return categories.filter(Boolean);
};

/**
 * Normalize categories to array of objects
 * Ensures consistent object format with categoryId and optional maxParticipants
 */
export const normalizeCategoryObjects = (categories, allCategories = []) => {
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return [];
  }

  // If already objects, ensure they have the right structure
  if (typeof categories[0] === 'object' && categories[0] !== null) {
    return categories.map(cat => ({
      categoryId: cat.categoryId || cat.id,
      name: cat.name,
      maxParticipants: cat.maxParticipants || null,
      ...cat
    }));
  }

  // If array of IDs, convert to objects
  return categories.map(categoryId => {
    const fullCategory = allCategories.find(c => c.categoryId === categoryId);
    return {
      categoryId,
      name: fullCategory?.name || categoryId,
      maxParticipants: null
    };
  });
};

/**
 * Check if a category is selected
 */
export const isCategorySelected = (categoryId, selectedCategories) => {
  if (!selectedCategories || selectedCategories.length === 0) {
    return false;
  }

  // Handle array of IDs
  if (typeof selectedCategories[0] === 'string') {
    return selectedCategories.includes(categoryId);
  }

  // Handle array of objects
  if (typeof selectedCategories[0] === 'object' && selectedCategories[0] !== null) {
    return selectedCategories.some(cat => 
      (cat.categoryId || cat.id) === categoryId
    );
  }

  return false;
};

/**
 * Get category display name
 */
export const getCategoryDisplayName = (category) => {
  if (!category) return 'Unknown Category';
  
  if (typeof category === 'string') {
    return category;
  }
  
  const name = category.name || category.categoryId || category.id || 'Unknown';
  const participants = category.maxParticipants;
  const currentCount = category.currentParticipants || 0;
  
  if (participants) {
    return `${name} (${currentCount}/${participants})`;
  } else {
    return `${name} (${currentCount} participants)`;
  }
};

/**
 * Format categories for display in event summary
 * Example: "Men's Advanced: 5 (unlimited), Women's RX: 3/10"
 */
export const formatCategoriesForDisplay = (categories, allCategories = []) => {
  if (!categories || categories.length === 0) {
    return 'No categories assigned';
  }

  const normalized = normalizeCategoryObjects(categories, allCategories);
  
  return normalized.map(cat => {
    const count = cat.currentParticipants || 0;
    const max = cat.maxParticipants;
    
    if (max) {
      return `${cat.name}: ${count}/${max}`;
    } else {
      return `${cat.name}: ${count} (unlimited)`;
    }
  }).join(', ');
};

/**
 * Example usage:
 * 
 * // Normalize to IDs
 * const ids = normalizeCategoryIds(event.categories);
 * 
 * // Normalize to objects
 * const objects = normalizeCategoryObjects(event.categories, allCategories);
 * 
 * // Check if selected
 * const isSelected = isCategorySelected('cat-1', event.categories);
 * 
 * // Format for display
 * const display = formatCategoriesForDisplay(event.categories, allCategories);
 */
