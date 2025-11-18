#!/usr/bin/env node

/**
 * Script to remove unused imports from React components
 * Focuses on common patterns like unused API methods
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'frontend/src/components/AthleteProfile.jsx',
  'frontend/src/components/AthleteScheduleViewer.jsx',
  'frontend/src/components/Dashboard.jsx',
  'frontend/src/components/Events.jsx',
  'frontend/src/components/Leaderboard.jsx',
  'frontend/src/components/PublicWODs.jsx',
  'frontend/src/components/SchedulerWizard.jsx',
  'frontend/src/components/ScoreEntry.jsx',
  'frontend/src/components/athlete/AthleteEventDetails.jsx',
  'frontend/src/components/backoffice/EventDetails.jsx',
  'frontend/src/components/backoffice/EventEdit.jsx',
  'frontend/src/components/backoffice/EventManagement/CategorySelector.jsx',
  'frontend/src/components/backoffice/EventManagement/EventForm.jsx',
  'frontend/src/components/backoffice/EventManagement/WodSelector.jsx',
  'frontend/src/components/backoffice/EventManagement/index.jsx',
  'frontend/src/components/backoffice/ScoreEntry.jsx',
  'frontend/src/components/backoffice/ScoreManagement.jsx',
  'frontend/src/components/backoffice/ScoringSystemManager.jsx',
  'frontend/src/hooks/useAthleteProfile.js',
  'frontend/src/hooks/useAthletes.js',
  'frontend/src/hooks/useEvents.js',
  'frontend/src/hooks/useScores.js'
];

function removeUnusedImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Pattern: import { get, post, put, del } from '../../lib/api';
    // We need to check which ones are actually used
    const apiImportMatch = content.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"].*\/lib\/api['"]/);
    
    if (apiImportMatch) {
      const imports = apiImportMatch[1].split(',').map(i => i.trim());
      const usedImports = [];
      
      imports.forEach(imp => {
        // Check if the import is used in the file (not in the import line itself)
        const importName = imp.trim();
        const regex = new RegExp(`\\b${importName}\\s*\\(`, 'g');
        const matches = content.match(regex);
        
        // If found more than once (once in import, rest in usage)
        if (matches && matches.length > 0) {
          // Check if it's actually used in code (not just imported)
          const codeWithoutImport = content.replace(/import\s*{[^}]+}\s*from\s*['"].*\/lib\/api['"];?/, '');
          if (codeWithoutImport.includes(`${importName}(`)) {
            usedImports.push(importName);
          }
        }
      });
      
      if (usedImports.length > 0 && usedImports.length < imports.length) {
        const newImport = `import { ${usedImports.join(', ')} } from '../../lib/api';`;
        content = content.replace(/import\s*{[^}]+}\s*from\s*['"].*\/lib\/api['"];?/, newImport);
      } else if (usedImports.length === 0) {
        // Remove the entire import line
        content = content.replace(/import\s*{[^}]+}\s*from\s*['"].*\/lib\/api['"];?\n?/, '');
      }
    }
    
    // Remove unused AWS Amplify API imports
    const amplifyImportMatch = content.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]aws-amplify\/api['"]/);
    if (amplifyImportMatch) {
      const imports = amplifyImportMatch[1].split(',').map(i => i.trim());
      const usedImports = [];
      
      imports.forEach(imp => {
        const importName = imp.trim();
        const codeWithoutImport = content.replace(/import\s*{[^}]+}\s*from\s*['"]aws-amplify\/api['"];?/, '');
        if (codeWithoutImport.includes(importName)) {
          usedImports.push(importName);
        }
      });
      
      if (usedImports.length > 0 && usedImports.length < imports.length) {
        const newImport = `import { ${usedImports.join(', ')} } from 'aws-amplify/api';`;
        content = content.replace(/import\s*{[^}]+}\s*from\s*['"]aws-amplify\/api['"];?/, newImport);
      }
    }
    
    // Remove unused React imports in test files
    if (filePath.includes('__tests__') || filePath.includes('.test.')) {
      if (!content.includes('React.') && !content.includes('<React')) {
        content = content.replace(/import\s+React\s+from\s+['"]react['"];?\n?/, '');
      }
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed: ${filePath}`);
      return true;
    } else {
      console.log(`- No changes: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

console.log('Fixing unused imports...\n');

let fixedCount = 0;
filesToFix.forEach(file => {
  if (removeUnusedImports(file)) {
    fixedCount++;
  }
});

console.log(`\n✓ Fixed ${fixedCount} files`);
