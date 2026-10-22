# Phase 7 notes

Inspection of the buyer, vendor, and admin paths, and a check that the service role stays off the phone. The code check is done. The two-phone walkthrough with advisors has not been run, so this gate stays open.

`npx tsc --noEmit` and `npx expo lint` were already clean at the end of phase 6. This pass did not change app code.

## Service role

The app client in `src/lib/supabase.ts` is created with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. `.env` is gitignored. `.env.example` lists only those public values.

`SUPABASE_SERVICE_ROLE_KEY` is read in `supabase/functions/_shared/admin.ts` for Edge Functions. No file under `src/` reads it, and no screen imports a service-role client.

Roles come from `profiles.role`. The admin dashboard redirects anyone else to Home, and the admin queries stay disabled unless that role is admin. The admin RPCs still call `is_admin()` on the server.

Screens do not call Supabase. The root layout uses the client only to start and stop auth refresh. `src/hooks/useProfileStats.ts` still queries orders and products directly. That is the anon key under the signed-in session, not the service role.

Ratings, review counts, distance, and wishlist hearts render only when a caller passes them. Current cards do not pass them.

## What each person can do

The visible tabs are Home, Explore, Orders, and Profile for every signed-in role. Extra tools are rows and screens, not extra tabs.

| Person | How the app treats them |
| --- | --- |
| Buyer | Browses, searches, messages, and places a cash-on-delivery order in GHS. Profile has no Admin Dashboard row |
| Approved vendor | My Shop, product form, and Incoming orders. Verified Vendor follows `vendors.status === 'approved'` |
| Admin | Profile shows Admin Dashboard. Shops, Products, and Audit on `/dashboard` |

Payment stays cash on delivery. Order screens show that label and do not show `payment_status`.

## Still open before advisors

These human checks were written in earlier notes and have not been run:

- Phase 2: sign up, log in, stay logged in after restart, and confirm the experience matches `profiles.role`. Add `campusplug://reset-password` to the Supabase auth redirect URLs.
- Phase 3: an approved vendor lists a product and a buyer finds it.
- Phase 4: a buyer places an order, the vendor accepts, and both see live updates.
- Phase 5: edit name and photo, open a notification, and tap through. Delete account is optional.
- Phase 6: approve, reject, hide, and remove, then read the audit row.
- Push still needs a development build with an EAS project id. Expo Go skips registration.

## Advisor walkthrough

Use two phones. Phone A is the buyer. Phone B starts as an approved vendor with one active product, then you sign that phone into the admin account for the last steps. A third account is admin if the vendor should not also be admin.

1. On A, sign up or sign in, force-quit, reopen, and confirm the session is still there. Confirm Home, Explore, Orders, and Profile. Confirm Admin Dashboard is absent.
2. On B, confirm My Shop and an active product. On A, find that product from Home or Explore and open the shop.
3. On A, place an order with a meeting point. Confirm Cash on delivery. On B, accept it and confirm A updates to Preparing without a manual refresh. Send one chat each way and confirm both threads update.
4. On A, change the name and photo in Settings and confirm the header photo updates. Open the bell on B and tap the new-order row. Confirm it opens the order and the row is marked read.
5. Sign B into the admin. Confirm non-admins cannot stay on `/dashboard`. Approve or reject a pending shop, hide and show a product, and confirm Audit shows the matching row. Skip removing a shop you still need.
6. Confirm neither phone has a service-role key in the app, and that a buyer cannot approve a shop.

Phase 8 has not been started.
