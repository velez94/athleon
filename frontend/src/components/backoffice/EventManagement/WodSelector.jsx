import { useState, useEffect, useMemo } from 'react';
import { get, post, put, del } from '../../../lib/api';

/**
 * WodSelector Component
 * Allows selecting WODs for an event with search and filtering
 */
const WodSelector = ({ selectedWods = [], onChange }) => {
  const [availableWods, setAvailableWods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFormat, setFilterFormat] = useState('all');

  useEffect(() => {
    fetchWods();
  }, []);

  const fetchWods = async () => {
    try {
      setLoading(true);
      const response = await get('/wods');
      setAvailableWods(response || []);
    } catch (error) {
      console.error('Error fetching WODs:', error);
      setAvailableWods([]);
    } finally {
      setLoading(false);
    }
  };

  // Memoized filtered WODs
  const filteredWods = useMemo(() => {
    return availableWods
      .filter(wod => !selectedWods.find(w => w.wodId === wod.wodId))
      .filter(wod => {
        const matchesSearch = !searchTerm || 
          wod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          wod.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesFormat = filterFormat === 'all' || 
          wod.format?.toLowerCase() === filterFormat.toLowerCase();
        
        return matchesSearch && matchesFormat;
      });
  }, [availableWods, selectedWods, searchTerm, filterFormat]);

  const handleAddWod = (wod) => {
    onChange([...selectedWods, wod]);
  };

  const handleRemoveWod = (wodId) => {
    onChange(selectedWods.filter(w => w.wodId !== wodId));
  };

  if (loading) {
    return <div className="loading">Loading WODs...</div>;
  }

  return (
    <div className="wod-selector">
      <div className="selector-layout">
        {/* Available WODs */}
        <div className="available-section">
          <h4>Available WODs</h4>
          
          <div className="controls">
            <input
              type="text"
              placeholder="🔍 Search WODs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              aria-label="Search WODs"
            />
            
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="filter-select"
              aria-label="Filter by format"
            >
              <option value="all">All Formats</option>
              <option value="amrap">AMRAP</option>
              <option value="chipper">Chipper</option>
              <option value="emom">EMOM</option>
              <option value="rft">RFT</option>
              <option value="ladder">Ladder</option>
              <option value="tabata">Tabata</option>
            </select>
          </div>

          <div className="wods-list">
            {filteredWods.length > 0 ? (
              filteredWods.map(wod => (
                <div key={wod.wodId} className="wod-card">
                  <div className="wod-header">
                    <h5>{wod.name}</h5>
                    <span className={`format-badge ${wod.format?.toLowerCase()}`}>
                      {wod.format}
                    </span>
                  </div>
                  <p className="wod-description">{wod.description}</p>
                  <button
                    type="button"
                    onClick={() => handleAddWod(wod)}
                    className="btn-add"
                    aria-label={`Add ${wod.name}`}
                  >
                    + Add
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No WODs found</p>
              </div>
            )}
          </div>
        </div>

        {/* Selected WODs */}
        <div className="selected-section">
          <h4>Selected WODs ({selectedWods.length})</h4>
          
          {selectedWods.length > 0 ? (
            <div className="selected-list">
              {selectedWods.map((wod, index) => (
                <div key={wod.wodId} className="selected-item">
                  <div className="item-info">
                    <span className="item-number">{index + 1}</span>
                    <div>
                      <strong>{wod.name}</strong>
                      <span className="format-text">{wod.format}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveWod(wod.wodId)}
                    className="btn-remove"
                    aria-label={`Remove ${wod.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No WODs selected</p>
              <small>Add WODs from the available list</small>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .wod-selector {
          width: 100%;
        }
        
        .selector-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        
        .available-section,
        .selected-section {
          display: flex;
          flex-direction: column;
        }
        
        .available-section h4,
        .selected-section h4 {
          margin: 0 0 16px 0;
          color: #495057;
          font-size: 16px;
        }
        
        .controls {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .search-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .filter-select {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 6px;
          font-size: 14px;
          min-width: 150px;
        }
        
        .wods-list,
        .selected-list {
          max-height: 400px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .wod-card {
          padding: 16px;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          background: #f8f9fa;
          transition: all 0.2s;
        }
        
        .wod-card:hover {
          border-color: #007bff;
          background: white;
        }
        
        .wod-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .wod-header h5 {
          margin: 0;
          font-size: 14px;
          color: #2c3e50;
        }
        
        .format-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .format-badge.amrap {
          background: #d4edda;
          color: #155724;
        }
        
        .format-badge.chipper {
          background: #d1ecf1;
          color: #0c5460;
        }
        
        .format-badge.emom {
          background: #fff3cd;
          color: #856404;
        }
        
        .format-badge.rft {
          background: #f8d7da;
          color: #721c24;
        }
        
        .wod-description {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #6c757d;
          line-height: 1.4;
        }
        
        .btn-add {
          width: 100%;
          padding: 8px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .btn-add:hover {
          background: #0056b3;
        }
        
        .selected-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 8px;
        }
        
        .item-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        
        .item-number {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #007bff;
          color: white;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 600;
        }
        
        .item-info strong {
          display: block;
          font-size: 14px;
          color: #2c3e50;
        }
        
        .format-text {
          display: block;
          font-size: 12px;
          color: #6c757d;
        }
        
        .btn-remove {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .btn-remove:hover {
          background: #c82333;
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
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #6c757d;
        }
        
        @media (max-width: 768px) {
          .selector-layout {
            grid-template-columns: 1fr;
          }
          
          .controls {
            flex-direction: column;
          }
          
          .filter-select {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default WodSelector;
