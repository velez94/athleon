import PropTypes from 'prop-types';
import Button from '../../common/Button';
import './ProfileHeader.css';

const ProfileHeader = ({ profile, categories, onSignOut }) => {
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
  const categoryName = categories.find(c => c.categoryId === profile.categoryId)?.name || 'Category not assigned';

  return (
    <header className="profile-header">
      <div className="header-content">
        <div className="profile-info">
          <div className="avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="profile-details">
            <h1 className="profile-name">{fullName}</h1>
            <p className="profile-category">{categoryName}</p>
            <p className="profile-email">{profile.email}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={onSignOut}
          ariaLabel="Sign out of your account"
        >
          Sign Out
        </Button>
      </div>
    </header>
  );
};

ProfileHeader.propTypes = {
  profile: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    categoryId: PropTypes.string
  }).isRequired,
  categories: PropTypes.arrayOf(PropTypes.shape({
    categoryId: PropTypes.string,
    name: PropTypes.string
  })).isRequired,
  onSignOut: PropTypes.func.isRequired
};

export default ProfileHeader;
