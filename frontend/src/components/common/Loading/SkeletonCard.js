import PropTypes from 'prop-types';
import './Loading.css';

const SkeletonCard = ({ count = 1, height = '200px' }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-card" style={{ height }}>
          <div className="skeleton-header">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-text-group">
              <div className="skeleton-text skeleton-text-title"></div>
              <div className="skeleton-text skeleton-text-subtitle"></div>
            </div>
          </div>
          <div className="skeleton-body">
            <div className="skeleton-text"></div>
            <div className="skeleton-text"></div>
            <div className="skeleton-text skeleton-text-short"></div>
          </div>
        </div>
      ))}
    </>
  );
};

SkeletonCard.propTypes = {
  count: PropTypes.number,
  height: PropTypes.string
};

export default SkeletonCard;
