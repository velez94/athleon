import { useState, useEffect } from 'react';
import { get, post, put, del } from '../../../lib/api';
import { isCategorySelected } from '../../../utils/categoryHelpers';

/**
 * CategorySelector Component
 * Allows selecting categories for an event
 * Handles both array of IDs and array of category objects
 */
const CategorySelector = ({ selectedCategories = [], onChange }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await get('/categories');
      setCategories(response || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (categoryId) => {
    const isCurrentlySelected = isCategorySelected(categoryId, selectedCategories);
    
    // Determine the format to use based on current selectedCategories
    const useObjectFormat = selectedCategories.length > 0 && 
                           typeof selectedCategories[0] === 'object' && 
                           selectedCategories[0] !== null;
    
    if (isCurrentlySelected) {
      // Remove category
      if (useObjectFormat) {
        onChange(selectedCategories.filter(cat => 
          (cat.categoryId || cat.id) !== categoryId
        ));
      } else {
        onChange(selectedCategories.filter(id => id !== categoryId));
      }
    } else {
      // Add category
      if (useObjectFormat) {
        const category = categories.find(c => c.categoryId === categoryId);
        onChange([...selectedCategories, { 
          categoryId: category.categoryId,
          name: category.name,
          maxParticipants: null 
        }]);
      } else {
        onChange([...selectedCategories, categoryId]);
      }
    }
  };

  const handleQuotaChange = (categoryId, maxParticipants) => {
    const useObjectFormat = selectedCategories.length > 0 && 
                           typeof selectedCategories[0] === 'object' && 
                           selectedCategories[0] !== null;
    
    if (useObjectFormat) {
      onChange(selectedCategories.map(cat => 
        (cat.categoryId || cat.id) === categoryId 
          ? { ...cat, maxParticipants: maxParticipants ? parseInt(maxParticipants) : null }
          : cat
      ));
    }
  };

  if (loading) {
    return <div className="loading">Loading categories...</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="empty-state">
        <p>No categories available</p>
        <small>Create categories first to assign them to events</small>
      </div>
    );
  }

  return (
    <div className="category-selector">
      <p className="description">Select the categories available for this event</p>
      
      <div className="categories-grid">
        {categories.map(category => {
          const isSelected = isCategorySelected(category.categoryId, selectedCategories);
          
          return (
            <label 
              key={category.categoryId} 
              className={`category-card ${isSelected ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(category.categoryId)}
                className="category-checkbox"
                aria-label={`Select ${category.name}`}
              />
              
              <div className="category-content">
                <div className="category-header">
                  <h5>{category.name}</h5>
                  {isSelected && (
                    <span className="check-icon" aria-hidden="true">✓</span>
                  )}
                </div>
                
                {category.description && (
                  <p className="category-description">{category.description}</p>
                )}
                
                <div className="category-meta">
                  {category.gender && (
                    <span className="meta-tag">
                      <span aria-hidden="true">👤</span> {category.gender}
                    </span>
                  )}
                  {category.minAge && category.maxAge && (
                    <span className="meta-tag">
                      <span aria-hidden="true">🎂</span> {category.minAge}-{category.maxAge} years
                    </span>
                  )}
                  {category.minAge && !category.maxAge && (
                    <span className="meta-tag">
                      <span aria-hidden="true">🎂</span> {category.minAge}+ years
                    </span>
                  )}
                  {!category.minAge && category.maxAge && (
                    <span className="meta-tag">
                      <span aria-hidden="true">🎂</span> Under {category.maxAge} years
                    </span>
                  )}
                </div>
                
                {isSelected && (
                  <div className="category-quota" onClick={(e) => e.preventDefault()}>
                    <label htmlFor={`quota-${category.categoryId}`}>Max Participants:</label>
                    <input
                      id={`quota-${category.categoryId}`}
                      type="number"
                      value={selectedCategories.find(c => (c.categoryId || c.id) === category.categoryId)?.maxParticipants || ''}
                      onChange={(e) => handleQuotaChange(category.categoryId, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Unlimited"
                      min="1"
                      className="quota-input"
                    />
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      <style>{`
        .category-selector {
          width: 100%;
        }
        
        .description {
          margin: 0 0 16px 0;
          color: #6c757d;
          font-size: 14px;
        }
        
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        
        .category-card {
          position: relative;
          padding: 16px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          display: block;
        }
        
        .category-card:hover {
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
        }
        
        .category-card.selected {
          border-color: #007bff;
          background: #f0f7ff;
        }
        
        .category-checkbox {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }
        
        .category-content {
          width: 100%;
        }
        
        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .category-header h5 {
          margin: 0;
          font-size: 16px;
          color: #2c3e50;
          font-weight: 600;
        }
        
        .check-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #007bff;
          color: white;
          border-radius: 50%;
          font-size: 14px;
          font-weight: bold;
        }
        
        .category-description {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #6c757d;
          line-height: 1.4;
        }
        
        .category-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .meta-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 12px;
          color: #495057;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #6c757d;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6c757d;
          background: #f8f9fa;
          border-radius: 8px;
          border: 2px dashed #dee2e6;
        }
        
        .empty-state p {
          margin: 0 0 4px 0;
        }
        
        .empty-state small {
          font-size: 12px;
          color: #adb5bd;
        }
        
        .category-quota {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e9ecef;
        }
        
        .category-quota label {
          display: block;
          font-size: 13px;
          color: #495057;
          margin-bottom: 6px;
          font-weight: 500;
        }
        
        .quota-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .quota-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }
        
        @media (max-width: 768px) {
          .categories-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CategorySelector;
