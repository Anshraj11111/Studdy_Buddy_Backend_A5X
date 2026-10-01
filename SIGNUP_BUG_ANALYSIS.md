# Signup Bug Analysis - A5x CCS Case

## Issue
User `a5xccss@ccs.com` (A5X CHRIS CHURCH) signed up but ended up with:
- ✅ `schoolPassword`: SET (hashed)
- ❌ `schoolName`: EMPTY
- ❌ `hasFreeAccess`: false (because schoolName is required)

## Root Cause

### Code Logic Issue
In `backend/src/services/auth.service.js` line 32:

```javascript
if ((role === 'student' || !role) && schoolPassword && schoolName) {
  // PreReg validation happens here
}
```

The PreReg validation ONLY runs if BOTH `schoolPassword` AND `schoolName` are provided.

### What Happened
User likely signed up in one of these scenarios:
1. **Provided schoolPassword but NO schoolName** → Validation skipped, schoolPassword hashed and saved, schoolName empty
2. **Frontend sent empty string for schoolName** → Truthy check passed for schoolPassword but not schoolName
3. **City field issue** → User mentioned "signup nhi ho rha tha city dala toh, city hataye uske baad signup hogya"

### Bug in Code
Lines 85-86 hash the school password REGARDLESS of whether PreReg validation happened:

```javascript
// Hash school password if provided
const hashedSchoolPassword = schoolPassword ? await this.hashPassword(schoolPassword) : '';
```

Then line 98 uses this hashed password:

```javascript
schoolPassword: hashedSchoolPassword,  // Uses hashed version even if validation was skipped
```

This means:
- If user provides schoolPassword but no schoolName → schoolPassword gets saved but schoolName doesn't
- User ends up with invalid state: has schoolPassword but no schoolName
- `hasFreeAccess` calculation fails because it requires BOTH fields

## Fix Applied

### 1. Fixed A5x User (DONE)
```javascript
// backend/fixA5xSchoolName.js
await User.updateOne(
  { email: 'a5xccss@ccs.com' },
  { $set: { schoolName: 'CCSS', city: 'Not Specified' } }
);
```

Result:
- ✅ schoolName: 'CCSS'
- ✅ schoolPassword: SET
- ✅ hasFreeAccess: true
- ✅ User now has course access

### 2. Verified Access
```bash
$ node verifyA5xAccess.js
✅ SUCCESS! User A5X CHRIS CHURCH now has FREE ACCESS to all courses!
```

## Prevention - Recommended Code Changes

### Option 1: Require Both or Neither (Recommended)
```javascript
// In auth.controller.js register function, add validation:
if ((schoolName && !schoolPassword) || (!schoolName && schoolPassword)) {
  return res.status(400).json({
    success: false,
    error: {
      message: 'Both school name and school password are required',
      code: 'INCOMPLETE_SCHOOL_INFO',
    },
  });
}
```

### Option 2: Only Hash if Both Provided
```javascript
// In auth.service.js, change line 85:
const hashedSchoolPassword = (schoolPassword && schoolName) 
  ? await this.hashPassword(schoolPassword) 
  : '';
```

### Option 3: Frontend Validation
Add validation in signup form to ensure both schoolName and schoolPassword are provided together or not at all.

## Timeline
- **Oct 1, 07:03** - PreReg entry created (schoolName: "CCSS", password: "Z2ZX45FI")
- **Oct 1, 07:15** - User signed up (schoolName: EMPTY, schoolPassword: SET)
- **Oct 1, 17:50** - We manually marked PreReg as used
- **Oct 1, 18:00** - Fixed User.schoolName to "CCSS"

## Status
- ✅ A5x user fixed and has course access
- ⚠️ Signup logic still has potential bug for future users
- 📝 Consider implementing Option 1 or Option 2 above

## Related Files
- `backend/src/services/auth.service.js` - Lines 32, 85, 98
- `backend/src/controllers/auth.controller.js` - Register function
- `backend/src/models/User.js` - Line 213 (hasFreeAccess calculation)
- `backend/fixA5xSchoolName.js` - Fix script
- `backend/verifyA5xAccess.js` - Verification script
