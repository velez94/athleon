import PropTypes from 'prop-types';
import './Loading.css';

const LoadingSpinner = ({ 
  size = 'md', 
  message, 
  className = '', 
  variant = 'spinner',
  fullScreen = false 
}) => {
  const containerClass = `loading-spinner-container ${fullScreen ? 'loading-fullscreen' : ''} ${className}`;
  
  return (
    <div className={containerClass}>
      <div className={`loading-${variant} loading-${variant}-${size}`} role="status" aria-live="polite">
        {variant === 'dots' && (
          <>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </>
        )}
        {variant === 'pulse' && (
          <div className="loading-pulse-inner"></div>
        )}
        {variant === 'bars' && (
          <>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
          </>
        )}
        <span className="sr-only">Loading...</span>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  message: PropTypes.string,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['spinner', 'dots', 'pulse', 'bars']),
  fullScreen: PropTypes.bool
};

export default LoadingSpinner;
