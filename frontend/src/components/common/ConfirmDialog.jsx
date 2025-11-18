import Modal from './Modal';
import './ConfirmDialog.css';

/**
 * ConfirmDialog Component
 * Reusable confirmation dialog for destructive actions
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger' // 'danger', 'warning', 'info'
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const footer = (
    <>
      <button 
        onClick={onClose}
        className="btn-outline"
        type="button"
      >
        {cancelText}
      </button>
      <button 
        onClick={handleConfirm}
        className={`btn-${variant}`}
        type="button"
      >
        {confirmText}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      size="small"
      closeOnOverlayClick={false}
    >
      <div className="confirm-dialog-content">
        <div className={`confirm-icon ${variant}`}>
          {variant === 'danger' && '⚠️'}
          {variant === 'warning' && '⚡'}
          {variant === 'info' && 'ℹ️'}
        </div>
        <p className="confirm-message">{message}</p>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
