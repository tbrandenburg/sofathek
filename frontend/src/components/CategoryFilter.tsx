import React, { useState } from 'react';
import './CategoryFilter.css';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory?: string;
  onCategoryChange: (category: string | undefined) => void;
  loading?: boolean;
  className?: string;
  showAll?: boolean;
  allLabel?: string;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  loading = false,
  className = '',
  showAll = true,
  allLabel = 'All Categories',
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleCategoryClick = (category: string | undefined) => {
    onCategoryChange(category);
    setIsDropdownOpen(false);
  };

  const handleToggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const displayCategories = showAll ? [undefined, ...categories] : categories;

  if (loading) {
    return (
      <div className={`category-filter loading ${className}`}>
        <div className="category-buttons">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="category-button skeleton">
              <div className="skeleton-text"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className={`category-filter ${className}`}>
      {/* Desktop/Tablet View - Horizontal Buttons */}
      <div className="category-buttons desktop">
        {displayCategories.map(category => (
          <button
            key={category || 'all'}
            onClick={() => handleCategoryClick(category)}
            className={`category-button ${selectedCategory === category ? 'active' : ''}`}
            type="button"
          >
            {category || allLabel}
          </button>
        ))}
      </div>

      {/* Mobile View - Dropdown */}
      <div className="category-dropdown mobile">
        <button
          type="button"
          onClick={handleToggleDropdown}
          className={`dropdown-trigger ${isDropdownOpen ? 'open' : ''}`}
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
        >
          <span className="dropdown-label">{selectedCategory || allLabel}</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="dropdown-icon"
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </button>

        {isDropdownOpen && (
          <>
            <div
              className="dropdown-overlay"
              onClick={() => setIsDropdownOpen(false)}
              aria-hidden="true"
            />
            <div className="dropdown-menu" role="listbox">
              {displayCategories.map(category => (
                <button
                  key={category || 'all'}
                  onClick={() => handleCategoryClick(category)}
                  className={`dropdown-item ${selectedCategory === category ? 'active' : ''}`}
                  type="button"
                  role="option"
                  aria-selected={selectedCategory === category}
                >
                  {category || allLabel}
                  {selectedCategory === category && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CategoryFilter;
