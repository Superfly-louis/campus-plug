# Phase 6 notes

Admin review, removal, product moderation, and the audit log. Profile shows Admin Dashboard only when `profiles.role` is `admin`. `/dashboard` sends everyone else home. The screen calls the existing admin functions. Row-level security and `is_admin()` still decide what a session can read and write.

`npx tsc --noEmit` and `npx expo lint` both passed. This pass did not run the manual script.

## Routes

Visible tabs stay Home, Explore, Orders, and Profile. The dashboard stays a hidden tab.

| Route | Who | What it shows |
| --- | --- | --- |
| `/dashboard` | `profiles.role` is `admin` | Shops, Products, and Audit. Anyone else is sent to Home |
| `/profile` | Signed in | Admin Dashboard row only for an admin |

Shops has Applications and Approved. Applications lists `pending` shops. Approve confirms, then the shop can sell and the owner’s role becomes vendor. Reject asks for a reason. Approved lists shops that can be removed. Removal asks for a reason, hides that shop’s products, and a vendor account returns to a buyer. An admin who also owns the shop stays an admin.

Products filters are All, Active, Hidden, and Removed. Hide and Show ask first. Remove asks for a reason. A removed product can be shown again. Each card shows the title, shop, price, status, stock, and the moderation reason when one is stored.

Audit is read-only. A row shows the action, the admin name, the time, and the reason when the metadata has one. Shop approved, shop not approved, shop removed, product shown, product hidden, and product removed are the labels for the three functions.

A missing reason stays on the screen with the friendly error. The reason max is 500 characters. Lists pull to refresh, page 20 rows at a time, and show loading, empty, and error-with-retry.

## Query keys

Defined in `src/hooks/queries/keys.ts`. Lists use React Query with a 30 second stale time and one retry. The dashboard does not call Supabase. A query runs only while that admin section is open, and only when the signed-in profile is an admin.

| Key | Data |
| --- | --- |
| `['admin']` | Invalidation prefix for shops, products, and the audit log |
| `['admin', 'vendors', userId, status]` | Shops of one status, 20 per page, newest first |
| `['admin', 'products', userId, status]` | Products, `all` or one status, 20 per page, newest first, with the shop name |
| `['admin', 'audit', userId]` | Audit rows, 20 per page, newest first, with the admin’s public name |

Approve, reject, remove shop, and moderate product invalidate `['admin']`, `['vendors']`, and `['products']`, so the public shop and product lists refresh with the admin lists.

## Functions

The app calls the existing RPCs. It does not insert into `admin_audit_log`.

| Call | When | Server result |
| --- | --- | --- |
| `admin_review_vendor` | Approve or reject | Status, audit row `review_vendor`, notification `vendor_reviewed`. Approve also sets the owner’s role to vendor |
| `admin_remove_vendor` | Remove an approved shop | Status `removed`, products hidden except those already `removed_by_admin`, vendor role returns to buyer, audit row `remove_vendor`, notification `vendor_removed` |
| `admin_moderate_product` | Show, hide, or remove | Product status, audit row `moderate_product`, notification `product_moderated`. Removal stores the reason. Show and hide clear it |

## Earlier files changed

- `src/constants/theme.ts` — admin page size of 20 and a moderation reason max of 500.
- `src/lib/errors.ts` — friendly copy for admin-only, a missing or long reason, a missing shop or product, and an audit write.
- `src/hooks/queries/keys.ts` — admin shop, product, and audit keys.
- `src/hooks/queries/useAdmin.ts` — lists and the three mutations. Each list waits until its section is open.
- `src/app/(tabs)/dashboard.tsx` — replaced the placeholder.

New files: `src/lib/api/admin.ts`, `src/components/admin/VendorReviewCard.tsx`, `src/components/admin/ProductModerationCard.tsx`, `src/components/admin/AuditEntryCard.tsx`.

`supabase/` and `types/` were not changed. No migration was required.

## Assumptions and skipped

- The first admin is still set in SQL. This phase does not add a way to grant the admin role.
- Owner and admin names come from `public_profiles`. A missing name shows as “Deleted user”.
- Rejected and removed shops are not separate lists. Pending and approved are the two shop queues.
- The audit card reads `decision`, `status`, and `reason` from metadata when those values are strings. Other actions show the stored action text.
- No service role key in the app. No new admin screens beyond `/dashboard`.
- The manual script below was not run. The phase 2 sign-in gate, the phase 3 two-account find, the phase 4 two-phone order script, and the phase 5 one-phone script are still open. Push still needs a development build with an EAS project id.

## Manual test script

Use one phone signed in as an admin. You need a second account that has applied for a shop, and an approved shop with at least one product. The second account can be the browser. Skip any step that would remove a shop you still need.

1. Open Profile and confirm Admin Dashboard is visible. Sign in as a non-admin and confirm that row is absent, and opening `/dashboard` returns home.
2. As admin, open Applications. Approve a pending shop. Confirm it leaves the list, the owner can sell, and Audit shows Shop approved.
3. Reject another pending shop with no reason and confirm the error stays on screen. Reject it with a reason. Confirm Audit shows Shop not approved and the owner is notified in their inbox.
4. Open Products. Hide an active product, confirm buyers no longer see it, then Show it again. Remove one with a reason and confirm Audit shows Product removed.
5. Open Approved. Remove a shop with a reason. Confirm its products are hidden, a vendor owner is a buyer again, and Audit shows Shop removed.
