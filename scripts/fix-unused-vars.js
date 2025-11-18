#!/usr/bin/env node

/**
 * Script to fix unused variables by removing them or commenting them out
 */

const fs = require('fs');

const fixes = [
  // AthleteLeaderboard.jsx
  {
    file: 'frontend/src/components/AthleteLeaderboard.jsx',
    replacements: [
      {
        from: /const \[expandedCards, setExpandedCards\] = useState\(\{\}\);/,
        to: 'const [, setExpandedCards] = useState({});'
      },
      {
        from: /const \[publishedSchedules, setPublishedSchedules\] = useState\(\[\]\);/,
        to: 'const [, setPublishedSchedules] = useState([]);'
      },
      {
        from: /const \[selectedSchedule, setSelectedSchedule\] = useState\(null\);/,
        to: 'const [selectedSchedule] = useState(null);'
      }
    ]
  },
  // CustomSignUp.jsx
  {
    file: 'frontend/src/components/CustomSignUp.jsx',
    replacements: [
      {
        from: /function CustomSignUp\(\{ _onSuccess \}\)/,
        to: 'function CustomSignUp()'
      }
    ]
  },
  // SchedulerWizard.jsx
  {
    file: 'frontend/src/components/SchedulerWizard.jsx',
    replacements: [
      {
        from: /const eventResponse = await get\(/,
        to: 'await get('
      }
    ]
  },
  // ScoreEntry.jsx
  {
    file: 'frontend/src/components/ScoreEntry.jsx',
    replacements: [
      {
        from: /const \[entryMode, _setEntryMode\] = useState\('manual'\);/,
        to: "const [entryMode] = useState('manual');"
      },
      {
        from: /const \[scheduledSessions, setScheduledSessions\] = useState\(\[\]\);/,
        to: 'const [, setScheduledSessions] = useState([]);'
      },
      {
        from: /const _organizerId = user\?\.attributes\?\['custom:organizerId'\];/,
        to: "// const organizerId = user?.attributes?.['custom:organizerId'];"
      },
      {
        from: /const _handleSessionSelection = \(session\) => \{/,
        to: '// const handleSessionSelection = (session) => {'
      },
      {
        from: /sessions\.map\(\(session, sessionIndex\) => \(/,
        to: 'sessions.map((session) => ('
      }
    ]
  },
  // AthleteEventDetails.jsx
  {
    file: 'frontend/src/components/athlete/AthleteEventDetails.jsx',
    replacements: [
      {
        from: /const authError = error\.response\?\.status === 401 \|\| error\.response\?\.status === 403;/,
        to: '// const authError = error.response?.status === 401 || error.response?.status === 403;'
      }
    ]
  },
  // Test files
  {
    file: 'frontend/src/components/athlete/__tests__/ScoreDetails.test.jsx',
    replacements: [
      {
        from: /import React from 'react';/,
        to: ''
      }
    ]
  },
  {
    file: 'frontend/src/components/backoffice/__tests__/ScoreEntry.test.jsx',
    replacements: [
      {
        from: /import React from 'react';/,
        to: ''
      }
    ]
  },
  // AthleteManagement.jsx
  {
    file: 'frontend/src/components/backoffice/AthleteManagement.jsx',
    replacements: [
      {
        from: /} catch \(error\) \{\s+console\.error\('Error updating athlete category:', error\);/,
        to: '} catch (err) {\n        console.error(\'Error updating athlete category:\', err);'
      }
    ]
  },
  // EventDetails.jsx
  {
    file: 'frontend/src/components/backoffice/EventDetails.jsx',
    replacements: [
      {
        from: /const \[_eventDays, setEventDays\] = useState\(\[\]\);/,
        to: 'const [, setEventDays] = useState([]);'
      },
      {
        from: /const _getAthleteName = /,
        to: '// const getAthleteName = '
      },
      {
        from: /const _getCategoryName = /,
        to: '// const getCategoryName = '
      },
      {
        from: /const _getAthleteAlias = /,
        to: '// const getAthleteAlias = '
      },
      {
        from: /const _getWodName = /,
        to: '// const getWodName = '
      }
    ]
  },
  // EventManagement.jsx
  {
    file: 'frontend/src/components/backoffice/EventManagement.jsx',
    replacements: [
      {
        from: /const \[_uploading, setUploading\] = useState\(false\);/,
        to: 'const [, setUploading] = useState(false);'
      },
      {
        from: /const _handleAddWod = /,
        to: '// const handleAddWod = '
      },
      {
        from: /const _removeWod = /,
        to: '// const removeWod = '
      }
    ]
  },
  // EventForm.jsx
  {
    file: 'frontend/src/components/backoffice/EventManagement/EventForm.jsx',
    replacements: [
      {
        from: /} catch \(error\) \{\s+console\.error\('Error uploading image:', error\);/,
        to: '} catch (err) {\n        console.error(\'Error uploading image:\', err);'
      },
      {
        from: /const _success = await uploadImage\(file\);/,
        to: 'await uploadImage(file);'
      }
    ]
  },
  // EventManagement/index.jsx
  {
    file: 'frontend/src/components/backoffice/EventManagement/index.jsx',
    replacements: [
      {
        from: /const _navigate = useNavigate\(\);/,
        to: '// const navigate = useNavigate();'
      }
    ]
  },
  // GeneralLeaderboard.jsx
  {
    file: 'frontend/src/components/backoffice/GeneralLeaderboard.jsx',
    replacements: [
      {
        from: /const _getWorkoutName = /,
        to: '// const getWorkoutName = '
      }
    ]
  },
  // ScoreEntry.jsx (backoffice)
  {
    file: 'frontend/src/components/backoffice/ScoreEntry.jsx',
    replacements: [
      {
        from: /const \{ _user \} = useAuthenticator/,
        to: 'const { user: _user } = useAuthenticator'
      },
      {
        from: /const formatSecondsToTime = /,
        to: '// const formatSecondsToTime = '
      }
    ]
  },
  // ScoringSystemManager.jsx
  {
    file: 'frontend/src/components/backoffice/ScoringSystemManager.jsx',
    replacements: [
      {
        from: /const \[_exercises, setExercises\] = useState\(\[\]\);/,
        to: 'const [, setExercises] = useState([]);'
      }
    ]
  },
  // WODManagement.jsx
  {
    file: 'frontend/src/components/backoffice/WODManagement.jsx',
    replacements: [
      {
        from: /wod\.movements\.forEach\(\(movement, _idx\) => \{/,
        to: 'wod.movements.forEach((movement) => {'
      }
    ]
  },
  // ErrorBoundary files
  {
    file: 'frontend/src/components/common/ErrorBoundary.jsx',
    replacements: [
      {
        from: /componentDidCatch\(_error, errorInfo\)/,
        to: 'componentDidCatch(error, errorInfo)'
      }
    ]
  },
  {
    file: 'frontend/src/components/common/ErrorBoundary/ErrorBoundary.jsx',
    replacements: [
      {
        from: /componentDidCatch\(_error, errorInfo\)/,
        to: 'componentDidCatch(error, errorInfo)'
      }
    ]
  },
  // NotificationProvider.jsx
  {
    file: 'frontend/src/components/common/NotificationProvider.jsx',
    replacements: [
      {
        from: /notifications\.map\(\(_id\) => \(/,
        to: 'notifications.map((notification) => ('
      }
    ]
  },
  // Hooks
  {
    file: 'frontend/src/hooks/useAthleteProfile.js',
    replacements: [
      {
        from: /mutationFn: async \(\{ _data, _variables \}\) => \{/,
        to: 'mutationFn: async () => {'
      }
    ]
  }
];

console.log('Fixing unused variables...\n');

let fixedCount = 0;

fixes.forEach(({ file, replacements }) => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    replacements.forEach(({ from, to }) => {
      if (content.match(from)) {
        content = content.replace(from, to);
        changed = true;
      }
    });
    
    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✓ Fixed: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.log(`- Skip: ${file} (${error.message})`);
  }
});

console.log(`\n✓ Fixed ${fixedCount} files`);
