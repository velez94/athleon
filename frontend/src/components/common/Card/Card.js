import PropTypes from 'prop-types';
import clsx from 'clsx';
import './Card.css';

const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className = '',
  onClick,
  ariaLabel,
  ...props
}) => {
  const cardClasses = clsx(
    'card',
    `card-${variant}`,
    `card-padding-${padding}`,
    {
      'card-hoverable': hoverable,
      'card-clickable': onClick
    },
    className
  );

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={cardClasses}
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </Component>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'outlined', 'elevated']),
  padding: PropTypes.oneOf(['none', 'sm', 'md', 'lg']),
  hoverable: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func,
  ariaLabel: PropTypes.string
};

export default Card;
