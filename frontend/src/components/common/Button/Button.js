import PropTypes from 'prop-types';
import clsx from 'clsx';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className = '',
  type = 'button',
  onClick,
  ariaLabel,
  ...props
}) => {
  const buttonClasses = clsx(
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    {
      'btn-loading': loading,
      'btn-disabled': disabled,
      'btn-full-width': fullWidth,
      'btn-icon-only': icon && !children
    },
    className
  );

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <span className="btn-spinner" aria-hidden="true">
          <span className="spinner-icon"></span>
        </span>
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="btn-icon btn-icon-left" aria-hidden="true">{icon}</span>
      )}
      {children && <span className="btn-text">{children}</span>}
      {!loading && icon && iconPosition === 'right' && (
        <span className="btn-icon btn-icon-right" aria-hidden="true">{icon}</span>
      )}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'ghost', 'danger']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  fullWidth: PropTypes.bool,
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  className: PropTypes.string,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  onClick: PropTypes.func,
  ariaLabel: PropTypes.string
};

export default Button;
