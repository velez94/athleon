# Authorization Admin - Platform RBAC Management

## Overview
The Authorization Admin interface allows super admins to manage platform-wide roles, permissions, and user role assignments.

## Access
- **URL**: `/backoffice/authorization`
- **Required Role**: Super Admin (`admin@athleon.fitness`)
- **Navigation**: Visible only to super admin in backoffice sidebar (🔐 icon)

## Features

### 1. Roles Management
Create and manage platform roles:
- `super_admin` - Full platform access
- `organizer` - Event management
- `athlete` - Competition participation
- Custom roles as needed

### 2. Permissions Management
Define what each role can do:
- **Resource**: What entity (organizations, events, scores, etc.)
- **Actions**: What operations (read, write, delete, etc.)
- Example: `{ roleId: 'organizer', resource: 'events', actions: ['read', 'write'] }`

### 3. User Role Assignment
Assign roles to users:
- **User ID**: Cognito user identifier
- **Email**: User email for reference
- **Role**: Which role to assign
- **Context**: Scope (global or organization-specific)
- **TTL**: Auto-expiration (30 days default)

## API Endpoints

### Roles
```
GET    /authorization/roles              List all roles
POST   /authorization/roles              Create role
```

### Permissions
```
GET    /authorization/permissions        List all permissions
POST   /authorization/permissions        Create permission
PUT    /authorization/permissions/{roleId}/{resource}    Update permission
DELETE /authorization/permissions/{roleId}/{resource}    Delete permission
```

### User Roles
```
GET    /authorization/user-roles         List all user role assignments
POST   /authorization/user-roles         Assign role to user
```

### Authorization Check
```
POST   /authorization/authorize          Check if user has permission
Body: { userId, resource, action, contextId }
```

## Database Tables

### RolesTable
- **PK**: `roleId`
- **Attributes**: name, description, createdAt

### PermissionsTable
- **PK**: `roleId`
- **SK**: `resource`
- **Attributes**: actions (array), createdAt

### UserRolesTable
- **PK**: `userId`
- **SK**: `contextId`
- **Attributes**: roleId, email, assignedAt, ttl
- **TTL**: Auto-cleanup after 30 days

## Usage Examples

### Create a Role
1. Navigate to Authorization Admin
2. Click "Create Role"
3. Enter role ID (e.g., `event_judge`)
4. Enter name and description
5. Click "Create"

### Assign Permission
1. Select a role
2. Click "Add Permission"
3. Enter resource (e.g., `scores`)
4. Enter actions (e.g., `["read", "write"]`)
5. Click "Create"

### Assign Role to User
1. Click "Assign User Role"
2. Enter user ID (from Cognito)
3. Enter user email
4. Select role
5. Enter context (global or organization ID)
6. Click "Assign"

## Integration with Organization RBAC

The authorization system works alongside organization-based RBAC:

- **Organization Roles**: Managed via OrganizationManagement (owner/admin/member)
- **Platform Roles**: Managed via Authorization Admin (super_admin/organizer/athlete)

Both systems coexist:
- Organization roles control access within organizations
- Platform roles control system-wide capabilities

## Caching

The authorization system includes 5-minute in-memory caching:
- Reduces DynamoDB reads
- Improves performance
- Auto-clears on role assignment changes

## Security

- All endpoints require authentication
- Only super admin can manage roles/permissions
- User role assignments have TTL for security
- Permission checks are cached for performance

## Troubleshooting

### 404 Errors
- Ensure authorization Lambda is deployed
- Check API Gateway has `/authorization` resource
- Verify Lambda has correct environment variables

### Permission Denied
- Confirm user is super admin (`admin@athleon.fitness`)
- Check JWT token is valid
- Verify user email in token claims

### Changes Not Reflecting
- Wait for cache to expire (5 minutes)
- Or restart Lambda to clear cache
- Check CloudWatch logs for errors

## Deployment

Backend is automatically deployed with main CDK stack:
```bash
cd /home/labvel/projects/athleon/web_app_athleon
cdk deploy --profile labvel-dev
```

Frontend component is at:
```
frontend/src/components/backoffice/AuthorizationAdmin.jsx
```

## Future Enhancements

- Role hierarchy (role inheritance)
- Permission templates
- Bulk user role assignment
- Role expiration notifications
- Audit log viewer
- Permission testing tool
