import { useRef, useEffect } from 'react';
import { useKeyboardNavigation, useFocusTrap, useFocusRestore } from '../../hooks/useKeyboardNavigation';

/**
 * Accessible Modal Component
 * Includes keyboard navigation, focus trapping, and ARIA attributes
 */
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'medium', // small, medium, large
  closeOnOverlayClick = true,
  showCloseButton = true
}) => {
  const modalRef = useRef();

  // Keyboard navigation
  useKeyboardNavigation({
    onEscape: onClose
  });

  // Focus trap
  useFocusTrap(isOpen, modalRef);
  
  // Focus restoration
  useFocusRestore(isOpen);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const sizeClasses = {
    small: 'modal-small',
    medium: 'modal-medium',
    large: 'modal-large'
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className={`modal-content ${sizeClasses[size]}`}
        role="document"
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{title}</h2>
          {showCloseButton && (
            <button 
              onClick={onClose}
              className="modal-close"
              aria-label="Close modal"
              type="button"
            >
              ×
            </button>
          )}
        </div>
        
        <div className="modal-body">
          {children}
        </div>
        
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
          backdrop-filter: blur(2px);
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .modal-small {
          width: 100%;
          max-width: 400px;
        }
        
        .modal-medium {
          width: 100%;
          max-width: 600px;
        }
        
        .modal-large {
          width: 100%;
          max-width: 900px;
        }
        
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid #e9ecef;
        }
        
        .modal-title {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 32px;
          color: #6c757d;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }
        
        .modal-close:hover {
          background: #f8f9fa;
          color: #495057;
        }
        
        .modal-close:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }
        
        .modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        
        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #e9ecef;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        
        @media (max-width: 768px) {
          .modal-overlay {
            padding: 10px;
          }
          
          .modal-content {
            max-height: 95vh;
          }
          
          .modal-header {
            padding: 16px;
          }
          
          .modal-title {
            font-size: 20px;
          }
          
          .modal-body {
            padding: 16px;
          }
          
          .modal-footer {
            padding: 12px 16px;
            flex-direction: column-reverse;
          }
          
          .modal-footer button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default Modal;
