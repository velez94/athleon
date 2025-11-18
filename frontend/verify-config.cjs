#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Amplify Configuration\n');

// Check environment files
const envFiles = ['.env', '.env.development', '.env.production'];
const requiredVars = [
  'REACT_APP_API_URL',
  'REACT_APP_USER_POOL_ID',
  'REACT_APP_USER_POOL_CLIENT_ID',
  'REACT_APP_REGION'
];

console.log('📋 Checking environment files...\n');

envFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✓ Found: ${file}`);
    const content = fs.readFileSync(filePath, 'utf8');
    
    requiredVars.forEach(varName => {
      if (content.includes(varName)) {
        const match = content.match(new RegExp(`${varName}=(.+)`));
        if (match && match[1].trim()) {
          console.log(`  ✓ ${varName} is set`);
        } else {
          console.log(`  ⚠️  ${varName} is empty`);
        }
      } else {
        console.log(`  ✗ ${varName} is missing`);
      }
    });
    console.log('');
  } else {
    console.log(`✗ Missing: ${file}\n`);
  }
});

// Check amplifyconfiguration.js exists
console.log('📋 Checking Amplify configuration file...\n');
const configPath = path.join(__dirname, 'src', 'amplifyconfiguration.js');
if (fs.existsSync(configPath)) {
  console.log('✓ amplifyconfiguration.js exists');
  const content = fs.readFileSync(configPath, 'utf8');
  
  if (content.includes('Auth: {') && content.includes('Cognito: {')) {
    console.log('✓ Uses Amplify v6 format (Auth.Cognito)');
  } else {
    console.log('✗ Not using Amplify v6 format');
  }
  
  if (content.includes('Storage: {') && content.includes('S3: {')) {
    console.log('✓ Uses Amplify v6 format (Storage.S3)');
  } else {
    console.log('⚠️  Storage configuration may need update');
  }
  
  if (content.includes('API: {') && content.includes('REST: {')) {
    console.log('✓ Uses Amplify v6 format (API.REST)');
  } else {
    console.log('⚠️  API configuration may need update');
  }
} else {
  console.log('✗ amplifyconfiguration.js not found');
}

console.log('\n📋 Checking App.jsx imports...\n');
const appPath = path.join(__dirname, 'src', 'App.jsx');
if (fs.existsSync(appPath)) {
  const content = fs.readFileSync(appPath, 'utf8');
  
  if (content.includes("import amplifyConfig from './amplifyconfiguration'")) {
    console.log('✓ App.jsx imports amplifyconfiguration');
  } else {
    console.log('✗ App.jsx does not import amplifyconfiguration');
  }
  
  if (content.includes('Amplify.configure(amplifyConfig)')) {
    console.log('✓ App.jsx calls Amplify.configure()');
  } else {
    console.log('✗ App.jsx does not call Amplify.configure()');
  }
}

console.log('\n📋 Checking package.json...\n');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (pkg.dependencies['aws-amplify']) {
    const version = pkg.dependencies['aws-amplify'];
    console.log(`✓ aws-amplify: ${version}`);
    
    if (version.startsWith('^6') || version.startsWith('6')) {
      console.log('  ✓ Using Amplify v6');
    } else {
      console.log('  ⚠️  Not using Amplify v6 - may need upgrade');
    }
  } else {
    console.log('✗ aws-amplify not found in dependencies');
  }
  
  if (pkg.dependencies['@aws-amplify/ui-react']) {
    const version = pkg.dependencies['@aws-amplify/ui-react'];
    console.log(`✓ @aws-amplify/ui-react: ${version}`);
  }
}

console.log('\n✅ Verification complete!\n');
console.log('Next steps:');
console.log('1. Ensure all environment variables are set correctly');
console.log('2. Restart the development server: npm start');
console.log('3. Check browser console for Amplify configuration logs\n');
