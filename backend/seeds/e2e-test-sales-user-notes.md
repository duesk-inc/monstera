# E2E Test Sales User Notes

## Current Status
The sales test user (`sales_test@duesk.co.jp`) has been created successfully but with the following limitations:

### User Details:
- **ID**: e2e00001-0000-0000-0000-000000000002
- **Email**: sales_test@duesk.co.jp
- **Name**: テスト 営業
- **Password**: Test1234!
- **Current Role**: 4 (employee)
- **Intended Role**: 6 (sales_rep)
- **Active**: Yes

### Technical Limitation
The backend system currently only accepts roles 1-4:
- 1: super_admin
- 2: admin
- 3: manager
- 4: employee

Sales roles (5: sales_manager, 6: sales_rep) are defined in the system but the validation logic in `backend/internal/model/role.go` rejects them.

### Workaround
For E2E testing purposes, the sales user has been created with role 4 (employee) instead of role 6 (sales_rep). This allows the user to:
- Login successfully
- Access basic authenticated endpoints
- Participate in role-switching tests (as a different role from engineer)

### Future Enhancement
When the backend validation is updated to accept extended roles (5-6), update the sales user:
```sql
UPDATE users SET role = 6 WHERE email = 'sales_test@duesk.co.jp';
UPDATE user_roles SET role = 6 WHERE user_id = 'e2e00001-0000-0000-0000-000000000002';
```

### Testing Implications
- The sales user can be used for login tests
- Role-based access control tests may need adjustment
- The user functions as a regular employee rather than a sales representative
- For proposal/question response features that require sales role, alternative testing approaches may be needed