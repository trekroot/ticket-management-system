# Server Code Audit Report

**Generated:** 2025-12-17
**Codebase:** Ticket Management System (Node.js/Express/MongoDB)

---

## Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 1 | 5 | 3 | 0 |
| Data Integrity | 0 | 1 | 3 | 0 |
| Error Handling | 0 | 1 | 3 | 1 |
| Performance | 0 | 1 | 3 | 0 |
| API Design | 0 | 0 | 3 | 1 |
| Code Quality | 0 | 0 | 7 | 4 |
| **TOTALS** | **1** | **8** | **22** | **6** |

---

## 1. CRITICAL SECURITY ISSUES

### 1.1 Authentication Bypass via Development Mode
- [ ] **CRITICAL** - Remove or secure auth bypass
- **File:** `src/middleware/auth.js:17-25`
- **Issue:** Development auth bypass hardcoded into production path
```javascript
if (process.env.NODE_ENV === 'dev' && process.env.BYPASS_AUTH === 'true') {
  const testUser = await User.findById(process.env.BYPASS_AUTH_USER_ID);
  // ...
}
```
- **Risks:**
  - If `NODE_ENV=dev` and `BYPASS_AUTH=true` are set in production, entire authentication is bypassed
  - Allows impersonation with just a user ID
- **Recommendation:** Remove development auth bypass from production code; use separate development server or conditional imports

---

## 2. HIGH SEVERITY ISSUES

### 2.1 CORS Credentials with HTTP Origins
- [ ] **HIGH** - Review and secure CORS configuration
- **File:** `server.js:13-22`
- **Issue:** `credentials: true` with hardcoded origins including HTTP
- **Risks:**
  - HTTP origin (s3-website) is not encrypted
  - `localhost:5173` left in could allow local attackers
- **Recommendation:** Use environment-based CORS configuration; HTTPS-only

### 2.2 Insufficient Input Validation on User Creation
- [ ] **HIGH** - Add input validation library (joi/zod)
- **File:** `src/controllers/userController.js:120-148`
- **Issue:** `createUser` accepts raw `req.body` without sanitization
- **Risks:**
  - No validation of firstName/lastName (XSS risk)
  - No email format validation
  - No rate limiting on user creation
- **Recommendation:** Use joi or zod with schema validation

### 2.3 No Rate Limiting on Sensitive Endpoints
- [ ] **HIGH** - Implement rate limiting middleware
- **File:** Multiple route files
- **Issue:** No rate limiting on ticket creation, user registration, or matchmaker
- **Recommendation:** Implement `express-rate-limit` with different limits per endpoint

### 2.4 Route Parameter Mismatch (BUG)
- [x] **HIGH** - Fix route parameter name
- **File:** `src/routes/ticketRequestRoutes.js:73-74`
- **Issue:** Route uses `:id` but controller expects `gameId`
```javascript
router.route('/game/:id')  // ← Uses 'id'
  .get(verifyFirebaseToken, getRequestsByGame);

// Controller expects:
const { gameId } = req.params;  // ← Expects 'gameId' - BROKEN!
```
- **Impact:** Endpoint returns undefined/empty results

### 2.5 Missing Input Sanitization on Free Text Fields
- [ ] **HIGH** - Implement input sanitization for XSS/injection prevention
- **Files:** `src/controllers/feedbackController.js`, `src/controllers/userController.js`, `src/controllers/ticketRequestController.js`
- **Issue:** Free text fields (feedback comments, user names, ticket notes) are not sanitized before storage or display
- **Risks:**
  - Stored XSS attacks via malicious input in feedback or notes
  - NoSQL injection if special characters reach MongoDB queries
  - HTML injection in rendered output
- **Recommendation:**
  - **Backend (Required):** Use `xss`, `sanitize-html`, or `DOMPurify` (via jsdom) to sanitize all free-text input before storage. Backend validation cannot be bypassed.
  - **Frontend (UX):** Add client-side sanitization for immediate feedback, but never rely on it for security.
  - Apply to: feedback comments, firstName/lastName, ticket notes, any user-provided text

### 2.6 N+1 Query Pattern in Matchmaker
- [ ] **HIGH** - Optimize matchmaker queries
- **File:** `src/controllers/matchmakerController.js:310-341`
- **Issue:** `getAllUserTicketMatches` performs loop-based queries
- **Performance Impact:** For user with N tickets, performs 1 + N queries minimum
- **Recommendation:** Batch queries; cache computed scores; implement pagination

---

## 3. MEDIUM SEVERITY ISSUES

### 3.1 Security

#### 3.1.1 Dead Password Hash Transform
- [x] **MEDIUM** - Remove dead code
- **File:** `src/models/User.js:18-24`
- **Issue:** Schema transforms delete `passwordHash` but field doesn't exist
- **Recommendation:** Remove if not using password auth

#### 3.1.2 Insufficient Authorization on Matchmaker
- [x] **MEDIUM** - Review authorization logic
- **File:** `src/routes/matchmakerRoutes.js:16`
- **Issue:** `isTicketOwnerOrAdmin` may not prevent indirect ticket querying

#### 3.1.3 Missing Security Headers
- [ ] **MEDIUM** - Add helmet middleware
- **File:** `server.js`
- **Missing:** X-Content-Type-Options, X-Frame-Options, CSP, HSTS
- **Recommendation:** `npm install helmet` and add to middleware

### 3.2 Data Integrity

#### 3.2.1 No Foreign Key Constraints
- [ ] **MEDIUM** - Add pre-delete hooks
- **File:** `src/models/TicketRequest.js:16-28`
- **Issue:** `gameId` reference lacks validation; orphaned tickets possible
- **Recommendation:** Add cascade delete behavior

#### 3.2.2 Missing Schema Validation on Seats
- [ ] **MEDIUM** - Add custom seat validators
- **File:** `src/models/TicketRequest.js:141-179`
- **Issue:** No validation that seats are sequential or realistic

#### 3.2.3 Orphaned Tickets on User Deletion
- [x] **MEDIUM** - Handle all ticket statuses on user delete
- **File:** `src/controllers/userController.js:257-292`
- **Issue:** Only updates `open` tickets; leaves matched/completed orphaned

#### 3.2.4 Duplicate Email Across Auth Providers
- [x] **MEDIUM** - Validate email uniqueness across providers
- **File:** `src/models/User.js:3-8`
- **Issue:** Same email could register with different auth providers
- **Fixed:** Firebase Auth handles this - default "one account per email" policy prevents duplicates at the auth layer.

### 3.3 Error Handling

#### 3.3.1 Silent Error Swallowing in Optional Auth
- [ ] **MEDIUM** - Distinguish error types
- **File:** `src/middleware/auth.js:58-81`
- **Issue:** All errors silently swallowed; network errors same as invalid tokens

#### 3.3.2 Missing Populate Error Handling
- [x] **MEDIUM** - Add try-catch for populate operations
- **File:** `src/controllers/matchmakerController.js:155-193`
- **Issue:** No handling if `gameId` populate fails
- **Fixed:** Added checks for orphaned game references - returns error for source ticket, filters out matches with deleted games.

#### 3.3.3 Inconsistent Error Response Format
- [ ] **MEDIUM** - Standardize error responses
- **Files:** Multiple controllers
- **Issue:** Mix of `{ success: false, error }`, `{ error }`, `{ success: false, data: false }`

### 3.4 Performance

#### 3.4.1 Missing Database Indexes
- [ ] **MEDIUM** - Add missing indexes
- **File:** `src/models/TicketRequest.js:82-84`
- **Missing:**
  - `status` alone
  - `userId` + `status` compound
  - `createdAt` for sorting
  - `gameId` + `sectionType` for matchmaker

#### 3.4.2 Populate Overhead in List Endpoints
- [ ] **MEDIUM** - Add pagination
- **File:** `src/controllers/ticketRequestController.js:70-73`
- **Issue:** No pagination; returns potentially huge dataset

#### 3.4.3 No Score Caching in Matchmaker
- [ ] **MEDIUM** - Implement score caching
- **File:** `src/controllers/matchmakerController.js:23-142`
- **Issue:** Scores recalculated every request

### 3.5 API Design

#### 3.5.1 Route Ordering Risk
- [ ] **MEDIUM** - Review route ordering
- **File:** `src/routes/ticketRequestRoutes.js:67-74`
- **Issue:** `/game/:id` after `/:id` could cause conflicts

#### 3.5.2 PUT for State Change
- [ ] **MEDIUM** - Consider POST/PATCH for deactivate
- **File:** `src/routes/userRoutes.js:40`
- **Issue:** `PUT` for soft delete; better as `POST` or `PATCH`

---

## 4. LOW SEVERITY ISSUES

### 4.1 Code Quality

#### 4.1.1 Typo in Response
- [ ] **LOW** - Fix typo
- **File:** `src/controllers/ticketRequestController.js:32`
- **Issue:** `succes` instead of `success`

#### 4.1.2 Unused Function Parameter
- [ ] **LOW** - Remove unused `req` param
- **File:** `src/controllers/ticketRequestController.js:24`
- **ESLint:** `'req' is declared but its value is never read`

#### 4.1.3 Unnecessary Await Keywords
- [ ] **LOW** - Remove unnecessary awaits
- **File:** `src/controllers/matchmakerController.js:250,282,319`
- **ESLint:** `'await' has no effect on the type of this expression`

#### 4.1.4 Excessive Console.log Statements
- [ ] **LOW** - Replace with proper logging library
- **File:** `src/controllers/matchmakerController.js:27-140`
- **Issue:** 15+ debug statements; use winston/pino instead

#### 4.1.5 Dead Commented Code
- [ ] **LOW** - Remove or document disabled code
- **File:** `src/controllers/matchmakerController.js:39-62`
- **Issue:** 20+ lines of commented date range matching code

#### 4.1.6 Inconsistent Naming Conventions
- [ ] **LOW** - Standardize naming
- **Files:** Multiple
- **Issue:** `getTicketPairings` vs `getPairingsForTicketRequest`

### 4.2 Missing Error Handler
- [ ] **LOW** - Add CastError handling
- **File:** `src/controllers/ticketRequestController.js:99-125`
- **Issue:** `getRequestById` doesn't handle invalid ObjectId format

---

## 5. TODO ITEMS FOUND IN CODE

- [x] `src/middleware/authorize.js:32` - "TODO: FIX THE USAGES OF THIS - MESSY" - Fixed: split into `isTicketOwnerOrAdmin` and `isUserOwnerOrAdmin`
- [ ] `src/controllers/ticketRequestController.js:272` - "TODO: Consider soft delete instead of hard delete"
- [ ] `src/controllers/matchmakerController.js:102` - "TODO - find a way to reconcile if there are free tickets available"
- [ ] `src/models/TicketRequest.js:51` - "TODO: ignore ticketsTogether request if only 1 ticket"
- [ ] `src/config/firebase.js:9` - "TODO: Add support for qa vs PROD"

---

## 6. MISSING FEATURES / BEST PRACTICES

- [ ] Input validation library (joi/zod)
- [ ] Request logging (morgan)
- [ ] API versioning (`/api/v1/`)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Complete JSDoc comments
- [ ] Token revocation/logout handling

---

## Quick Reference: Files to Review

| File | Issues |
|------|--------|
| `src/middleware/auth.js` | Auth bypass, silent errors |
| `src/controllers/userController.js` | Input validation, user deletion, sanitization |
| `src/controllers/feedbackController.js` | Input sanitization needed |
| `src/controllers/matchmakerController.js` | N+1 queries, console.logs, awaits |
| `src/controllers/ticketRequestController.js` | Typo, unused param, error handling, sanitization |
| `src/routes/ticketRequestRoutes.js` | Route param bug, ordering |
| `src/models/TicketRequest.js` | Indexes, validation, foreign keys |
| `server.js` | CORS, security headers |

---

## Progress Tracking

**Started:** 2025-12-17
**Last Updated:** 2025-12-18
**Completed:** 8 / 37 items