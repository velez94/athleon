#!/usr/bin/env node

/**
 * Test script to verify role checking logic
 * This simulates the frontend role checking without needing to login
 */

// Simulate the role checking logic from frontend/src/utils/organizerRoles.js
const ORGANIZER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  EVENT_ADMIN: 'event_admin',
  AUXILIARY_ADMIN: 'auxiliary_admin'
};

function getOrganizerRole(user) {
  console.log('🔍 Testing getOrganizerRole with user:', {
    email: user?.attributes?.email,
    customRole: user?.attributes?.['custom:role'],
    organizerRole: user?.attributes?.['custom:organizerRole'],
    isSuperAdmin: user?.attributes?.['custom:isSuperAdmin']
  });
  
  // Check for super admin by email or role
  if (user?.attributes?.email === 'admin@athleon.fitness' || 
      user?.attributes?.['custom:role'] === 'super_admin') {
    console.log('✅ User is SUPER_ADMIN (by email or role)');
    return ORGANIZER_ROLES.SUPER_ADMIN;
  }
  
  // Check for super admin attribute (legacy)
  if (user?.attributes?.['custom:isSuperAdmin'] === 'true') {
    console.log('✅ User is SUPER_ADMIN (legacy attribute)');
    return ORGANIZER_ROLES.SUPER_ADMIN;
  }
  
  // Check for organizerRole attribute
  const organizerRole = user?.attributes?.['custom:organizerRole'];
  if (organizerRole && Object.values(ORGANIZER_ROLES).includes(organizerRole)) {
    console.log('✅ User has organizerRole:', organizerRole);
    return organizerRole;
  }
  
  // Legacy: if role is 'organizer', default to event_admin
  if (user?.attributes?.['custom:role'] === 'organizer') {
    console.log('✅ User is EVENT_ADMIN (legacy organizer role)');
    return ORGANIZER_ROLES.EVENT_ADMIN;
  }
  
  console.log('❌ User has no organizer role');
  return null;
}

function canAccessBackoffice(user) {
  const role = getOrganizerRole(user);
  return role !== null;
}

// Test cases
console.log('='.repeat(60));
console.log('Testing Role Logic');
console.log('='.repeat(60));

// Test 1: Admin by email
console.log('\n📋 Test 1: Admin by email');
console.log('-'.repeat(60));
const adminByEmail = {
  attributes: {
    email: 'admin@athleon.fitness',
    'custom:role': 'athlete' // Even with wrong role, email should work
  }
};
const result1 = canAccessBackoffice(adminByEmail);
console.log(`Result: ${result1 ? '✅ PASS' : '❌ FAIL'} - Can access backoffice: ${result1}`);

// Test 2: Admin by custom:role
console.log('\n📋 Test 2: Admin by custom:role');
console.log('-'.repeat(60));
const adminByRole = {
  attributes: {
    email: 'other@example.com',
    'custom:role': 'super_admin'
  }
};
const result2 = canAccessBackoffice(adminByRole);
console.log(`Result: ${result2 ? '✅ PASS' : '❌ FAIL'} - Can access backoffice: ${result2}`);

// Test 3: Admin with both email and role
console.log('\n📋 Test 3: Admin with both email and role (ideal case)');
console.log('-'.repeat(60));
const adminComplete = {
  attributes: {
    email: 'admin@athleon.fitness',
    'custom:role': 'super_admin'
  }
};
const result3 = canAccessBackoffice(adminComplete);
console.log(`Result: ${result3 ? '✅ PASS' : '❌ FAIL'} - Can access backoffice: ${result3}`);

// Test 4: Regular organizer
console.log('\n📋 Test 4: Regular organizer');
console.log('-'.repeat(60));
const organizer = {
  attributes: {
    email: 'organizer@example.com',
    'custom:role': 'organizer'
  }
};
const result4 = canAccessBackoffice(organizer);
console.log(`Result: ${result4 ? '✅ PASS' : '❌ FAIL'} - Can access backoffice: ${result4}`);

// Test 5: Athlete (should fail)
console.log('\n📋 Test 5: Athlete (should NOT access backoffice)');
console.log('-'.repeat(60));
const athlete = {
  attributes: {
    email: 'athlete@example.com',
    'custom:role': 'athlete'
  }
};
const result5 = canAccessBackoffice(athlete);
console.log(`Result: ${!result5 ? '✅ PASS' : '❌ FAIL'} - Can access backoffice: ${result5}`);

// Test 6: User with no attributes (should fail)
console.log('\n📋 Test 6: User with no attributes');
console.log('-'.repeat(60));
const noAttributes = {
  attributes: {}
};
const result6 = canAccessBackoffice(noAttributes);
console.log(`Result: ${!result6 ? '✅ PASS' : '❌ FAIL'} - Can access backoffice: ${result6}`);

// Test 7: Legacy super admin
console.log('\n📋 Test 7: Legacy super admin (custom:isSuperAdmin)');
console.log('-'.repeat(60));
const legacyAdmin = {
  attributes: {
    email: 'legacy@example.com',
    'custom:isSuperAdmin': 'true'
  }
};
const result7 = canAccessBackoffice(legacyAdmin);
console.log(`Result: ${result7 ? '✅ PASS' : '❌ FAIL'} - Can access backoffice: ${result7}`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('Summary');
console.log('='.repeat(60));
const passed = [result1, result2, result3, result4, !result5, !result6, result7].filter(Boolean).length;
const total = 7;
console.log(`Tests passed: ${passed}/${total}`);

if (passed === total) {
  console.log('✅ All tests passed! Role logic is working correctly.');
} else {
  console.log('❌ Some tests failed. Check the logic in organizerRoles.js');
}

console.log('\n💡 To test with real Cognito user:');
console.log('   1. Run: node scripts/verify-admin-user.js');
console.log('   2. Login at: https://dbtrhlzryzh8h.cloudfront.net/login');
console.log('   3. Check browser console for role detection logs');
