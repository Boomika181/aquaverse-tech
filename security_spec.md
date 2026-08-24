# Security Specification & Test Cases

This document defines the data invariants, test payloads, and security assertions for the AquaVerse AI database collections.

## 1. Data Invariants

- **Users**:
  - Every profile must map to a valid Firebase Authentication UID (`request.auth.uid == userId`).
  - Self-assignment of the `admin` role is strictly prohibited. The default role for citizens is `citizen`. Only existing admins or bootstrapping accounts can be assigned `admin` roles.
  - Profile timestamps are server-managed.

- **Predictions**:
  - A prediction record cannot be created without a valid signed-in user ID (`userId`).
  - Predictions must remain immutable once logged, except for administrator deletion.
  - Access is restricted: Citizens can only view their own predictions, while Admins can view all.

- **Contact Messages**:
  - Anyone (authenticated or unauthenticated) can submit a contact message.
  - Submissions are immutable once created.
  - Only Admins can list, read, resolve, or delete contact messages.

- **Uploaded Reports**:
  - Reports require an authenticated citizen.
  - Citizens can only query their own reports.
  - Admins can manage, review, and delete all reports.

- **Activity Logs**:
  - Automatically written during predictions and report submissions.
  - Immutable once created. Only readable by administrators.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following malicious payloads must be rejected by the security rules:

1. **Role Escalation via SignUp**: Registering a user profile with `"role": "admin"`.
2. **Identity Spoofing on Prediction**: Saving a prediction under a different user's `userId`.
3. **Malicious ID Poisoning**: Trying to create a prediction with a document ID containing special path characters or massive size to crash queries.
4. **Blanket Query Scraping**: Citizen querying `/predictions` without specifying a `where("userId", "==", userId)` filter.
5. **Unauthorized Message Reading**: Unauthenticated user trying to read or list submissions from `/contactMessages`.
6. **Fake Report Injection**: Unauthenticated user trying to write to `/uploadedReports`.
7. **Cross-User Report View**: Citizen A trying to fetch Citizen B's uploaded report by direct document ID.
8. **Malicious Log Tampering**: Citizen attempting to delete or overwrite `/activityLogs`.
9. **Spamming Messages with Giant Payloads**: Contact message with a 5MB message body (violates size limit rules).
10. **Report Status Overwrite**: Citizen trying to mark their own pending report as `resolved` (only allowed by admins).
11. **Client-Provided Time Hijacking**: citizen providing a historical/future `timestamp` or `createdAt` value instead of the server timestamp (`request.time`).
12. **Foreign Data Update Gap**: Citizen attempting to modify another user's email or displayName inside `/users/{otherId}`.

---

## 3. Test Assertions Checklist

| Collection | Operation | Actor | Payload / State | Expected Outcome |
|---|---|---|---|---|
| `/users/{uid}` | `create` | Citizen | `role: "admin"` | **PERMISSION_DENIED** |
| `/users/{uid}` | `create` | Citizen | `role: "citizen"` | **ALLOWED** |
| `/predictions/{id}` | `create` | Citizen | `userId: "other-uid"` | **PERMISSION_DENIED** |
| `/predictions` | `list` | Citizen | Query with no user filter | **PERMISSION_DENIED** |
| `/predictions` | `list` | Citizen | Query with `userId == auth.uid` | **ALLOWED** |
| `/contactMessages/{id}` | `read` | Citizen | Message document fetch | **PERMISSION_DENIED** |
| `/contactMessages` | `list` | Admin | Messages list fetch | **ALLOWED** |
| `/activityLogs/{id}` | `delete` | Admin | Immutable deletion | **PERMISSION_DENIED** |
