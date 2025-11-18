# Admin Login Debugging Guide

## Issue
The admin user (`admin@athleon.fitness`) is being routed to the athlete workflow instead of the backoffice admin workflow.

## Root Cause Analysis

The issue occurs in the authentication flow where the user's role is checked to determine routing:

1. **User logs in** → Cognito authenticates
2. **Authenticator component** → Passes user object to app
3. **canAccessBackoffice()** → Checks if user should access backoffice
4. **getOrganizerRole()** → Determines user's organizer role
5. **Routing decision** → BackofficeLayout vs UserSetup

## Expected Behavior

For `admin@athleon.fitness`:
- Should have `custom:role` = `super_admin` in Cognito
- Should be routed to `/backoffice/*` (BackofficeLayout)
- Should see all admin features

## Debugging Steps

### 1. Verify Cognito User Attributes

Run the verification script:
```bash
node scripts/verify-admin-user.js
```

This will:
- Check if the user exists
- Display all current attributes
- Update `custom:role` to `super_admin` if needed
- Verify email is set correctly

### 2. Check Browser Console Logs

After logging in with `admin@athleon.fitness`, check the browser console for:

```
🔍 User from Authenticator: {
  username: "admin@athleon.fitness",
  email: "admin@athleon.fitness",
  role: "super_admin",  // Should be "super_admin"
  ...
}

🔍 getOrganizerRole - checking user: {
  email: "admin@athleon.fitness",
  customRole: "super_admin",  // Should be "super_admin"
  ...
}

✅ User is SUPER_ADMIN (by email or role)

🔍 Final check - Is organizer? true  // Should be true
```

### 3. Common Issues

#### Issue: `custom:role` is not set
**Solution:** Run `node scripts/verify-admin-user.js` to set it

#### Issue: User attributes not loading
**Symptom:** Console shows `allAttributes: undefined` or `email: undefined`
**Solution:** The app now extracts attributes from ID token as fallback

#### Issue: User exists but can't login
**Solution:** Reset password:
```bash
node scripts/create-super-admin-user.js
```

#### Issue: Still routing to athlete workflow
**Check:**
1. Clear browser cache and localStorage
2. Sign out completely
3. Sign in again
4. Check console logs for the routing decision

### 4. Manual Cognito Check

Using AWS CLI:
```bash
aws cognito-idp admin-get-user \
  --user-pool-id us-east-2_hVzMW4EYB \
  --username admin@athleon.fitness \
  --region us-east-2
```

Expected output should include:
```json
{
  "Name": "custom:role",
  "Value": "super_admin"
}
```

### 5. Update User Attributes Manually

If needed:
```bash
aws cognito-idp admin-update-user-attributes \
  --user-pool-id us-east-2_hVzMW4EYB \
  --username admin@athleon.fitness \
  --user-attributes Name=custom:role,Value=super_admin \
  --region us-east-2
```

## Code Changes Made

### 1. Enhanced User Loading (`frontend/src/App.jsx`)
- Added `AuthenticatedRoutes` component
- Fetches full user data including ID token
- Extracts custom attributes from ID token if not in user object
- Comprehensive console logging for debugging

### 2. Enhanced Role Checking (`frontend/src/utils/organizerRoles.js`)
- Added detailed console logging
- Shows exactly which condition grants admin access
- Logs all user attributes being checked

### 3. Verification Script (`scripts/verify-admin-user.js`)
- Checks current user attributes
- Automatically fixes `custom:role` if incorrect
- Verifies email is set

## Role Checking Logic

The `getOrganizerRole()` function checks in this order:

1. **Email check**: `user.attributes.email === 'admin@athleon.fitness'` → SUPER_ADMIN
2. **Role check**: `user.attributes['custom:role'] === 'super_admin'` → SUPER_ADMIN
3. **Legacy check**: `user.attributes['custom:isSuperAdmin'] === 'true'` → SUPER_ADMIN
4. **Organizer role**: `user.attributes['custom:organizerRole']` → Returns that role
5. **Legacy organizer**: `user.attributes['custom:role'] === 'organizer'` → EVENT_ADMIN
6. **Default**: No organizer role → Routes to athlete workflow

## Testing

1. **Clear browser data**:
   - Clear cache
   - Clear localStorage
   - Close all browser tabs

2. **Login**:
   - Go to https://dbtrhlzryzh8h.cloudfront.net/login
   - Email: `admin@athleon.fitness`
   - Password: `SuperAdmin123!`

3. **Verify routing**:
   - Should redirect to `/backoffice`
   - Should see admin navigation sidebar
   - Should see "Platform Super Admin" role badge

4. **Check console**:
   - Should see `✅ User is SUPER_ADMIN`
   - Should see `🔍 Final check - Is organizer? true`

## Troubleshooting Checklist

- [ ] User exists in Cognito
- [ ] `custom:role` attribute is set to `super_admin`
- [ ] Email attribute is set to `admin@athleon.fitness`
- [ ] Email is verified
- [ ] Browser cache is cleared
- [ ] Console shows correct user attributes
- [ ] Console shows `isOrganizer = true`
- [ ] User is redirected to `/backoffice`

## Support

If the issue persists after following all steps:

1. Capture full console logs from login
2. Run `node scripts/verify-admin-user.js` and capture output
3. Check if other organizer users work correctly
4. Verify the Cognito User Pool ID matches in all configs
