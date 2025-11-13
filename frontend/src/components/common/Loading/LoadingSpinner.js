import PropTypes from 'prop-types';
import './Loading.css';

const LoadingSpinner = ({ size = 'md', message, className = '' }) => {
  return (
    <div className={`loading-spinner-container ${className}`}>
      <div className={`loading-spinner loading-spinner-${size}`} role="status" aria-live="polite">
        <span className="sr-only">Loading...</span>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  message: PropTypes.string,
  className: PropTypes.string
};

export default LoadingSpinner;
