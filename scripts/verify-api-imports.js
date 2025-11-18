#!/usr/bin/env node

/**
 * Verify that all files using API functions have the correct imports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Verifying API imports...\n');

// Find all files that use get, post, put, or del functions
const result = execSync(
  'grep -r "await get\\|await post\\|await put\\|await del" frontend/src --include="*.jsx" --include="*.js" -l',
  { encoding: 'utf8' }
);

const filesUsingApi = result.trim().split('\n').filter(Boolean);

let issuesFound = 0;

filesUsingApi.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check which API functions are used
    const usesGet = /await get\(/.test(content);
    const usesPost = /await post\(/.test(content);
    const usesPut = /await put\(/.test(content);
    const usesDel = /await del\(/.test(content);
    
    // Check what's imported (either from lib/api or aws-amplify/api)
    const libApiMatch = content.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"].*\/lib\/api['"]/);
    const amplifyApiMatch = content.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]aws-amplify\/api['"]/);
    
    if (!libApiMatch && !amplifyApiMatch) {
      console.log(`❌ ${file}`);
      console.log('   Missing API import entirely!');
      console.log('   Uses:', { get: usesGet, post: usesPost, put: usesPut, del: usesDel });
      issuesFound++;
      return;
    }
    
    // If using Amplify API, skip validation (different pattern)
    if (amplifyApiMatch && !libApiMatch) {
      console.log(`✓ ${file} (uses Amplify API)`);
      return;
    }
    
    const importMatch = libApiMatch;
    
    const imports = importMatch[1].split(',').map(i => i.trim());
    
    // Check for missing imports
    const missing = [];
    if (usesGet && !imports.includes('get')) missing.push('get');
    if (usesPost && !imports.includes('post')) missing.push('post');
    if (usesPut && !imports.includes('put')) missing.push('put');
    if (usesDel && !imports.includes('del')) missing.push('del');
    
    if (missing.length > 0) {
      console.log(`❌ ${file}`);
      console.log(`   Missing imports: ${missing.join(', ')}`);
      console.log(`   Current imports: ${imports.join(', ')}`);
      issuesFound++;
    } else {
      console.log(`✓ ${file}`);
    }
  } catch (error) {
    console.log(`⚠️  ${file} - Error: ${error.message}`);
  }
});

console.log(`\n${issuesFound === 0 ? '✅' : '❌'} Found ${issuesFound} issue(s)`);

if (issuesFound > 0) {
  process.exit(1);
}
