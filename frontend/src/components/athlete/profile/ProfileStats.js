import PropTypes from 'prop-types';
import Card from '../../common/Card';
import './ProfileStats.css';

const ProfileStats = ({ eventsCount, personalBestsCount, categoryName }) => {
  const stats = [
    {
      id: 'competitions',
      label: 'Total Competitions',
      value: eventsCount,
      icon: '🏆'
    },
    {
      id: 'bests',
      label: 'Personal Bests',
      value: personalBestsCount,
      icon: '🥇'
    },
    {
      id: 'category',
      label: 'Category',
      value: categoryName || 'Not assigned',
      icon: '🎯'
    }
  ];

  return (
    <div className="profile-stats">
      {stats.map(stat => (
        <Card 
          key={stat.id} 
          variant="elevated" 
          hoverable
          className="stat-card"
        >
          <div className="stat-icon" aria-hidden="true">{stat.icon}</div>
          <div className="stat-content">
            <h3 className="stat-label">{stat.label}</h3>
            <p className="stat-value">{stat.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

ProfileStats.propTypes = {
  eventsCount: PropTypes.number.isRequired,
  personalBestsCount: PropTypes.number.isRequired,
  categoryName: PropTypes.string
};

export default ProfileStats;
