import Link from "next/link";
import { plural } from "@/lib/format";

/** Attention banners for pending reviews and recent referral submissions. */
export function AdminAlerts({
  pending,
  referralsRecent,
}: {
  pending: number;
  referralsRecent: number;
}) {
  if (pending <= 0 && referralsRecent <= 0) return null;

  return (
    <div className="admin-alerts" aria-label="Admin attention">
      {pending > 0 ? (
        <div className="notice-inline warn" role="status">
          <p>
            {pending === 1
              ? "There’s 1 new recipe waiting in the review queue."
              : `There are ${pending} recipes waiting in the review queue.`}
          </p>
          <Link className="btn small" href="/admin/review">
            Review {plural(pending, "recipe")}
          </Link>
        </div>
      ) : null}
      {referralsRecent > 0 ? (
        <div className="notice-inline" role="status">
          <p>
            {referralsRecent === 1
              ? "A new referral submission came in this week."
              : `${referralsRecent} new referral submissions came in this week.`}
          </p>
          <Link className="btn small ghost" href="/admin/referrals">
            View referrals
          </Link>
        </div>
      ) : null}
    </div>
  );
}
