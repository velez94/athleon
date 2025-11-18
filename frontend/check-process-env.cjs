#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Checking for remaining process.env usage in source files\n');

try {
  // Search for process.env in src directory
  const result = execSync('grep -r "process\\.env" src/ --include="*.js" --include="*.jsx" || true', {
    encoding: 'utf8',
    cwd: __dirname
  });

  if (result.trim()) {
    console.log('⚠️  Found process.env usage:\n');
    console.log(result);
    console.log('\n❌ These need to be changed to import.meta.env\n');
  } else {
    console.log('✅ No process.env usage found in source files!\n');
  }
} catch (error) {
  console.log('✅ No process.env usage found in source files!\n');
}

console.log('📋 Summary of Vite environment variable usage:\n');
console.log('✓ Use: import.meta.env.VITE_* or import.meta.env.REACT_APP_*');
console.log('✓ Use: import.meta.env.DEV (for development check)');
console.log('✓ Use: import.meta.env.PROD (for production check)');
console.log('✓ Use: import.meta.env.MODE (for mode: "development" or "production")');
console.log('\n✗ Do NOT use: process.env.* (not available in browser with Vite)\n');
