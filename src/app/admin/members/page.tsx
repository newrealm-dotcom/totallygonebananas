import type { Metadata } from "next";
import Link from "next/link";
import { getMemberEngagement } from "@/lib/queries";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · Members" };

const fmt = new Intl.NumberFormat("en-US");

export default async function AdminMembersPage() {
  const stats = await getMemberEngagement();

  return (
    <>
      <div className="sec-head">
        <div>
          <h2>Members & engagement</h2>
          <p>
            First-party view of who joined and who&apos;s actually saving recipes or logging cooks —
            use this alongside{" "}
            <Link href="/admin/analytics">Analytics</Link> for anonymous traffic.
          </p>
        </div>
        <div className="row-actions">
          <Link className="btn small ghost" href="/admin/newsletter">
            Newsletter list
          </Link>
          <Link className="btn small ghost" href="/admin/users">
            Roles
          </Link>
        </div>
      </div>

      <ul className="admin-stats">
        <li className="stat">
          <b>{fmt.format(stats.membersTotal)}</b>
          <span>Members</span>
        </li>
        <li className="stat">
          <b>{fmt.format(stats.membersJoined7d)}</b>
          <span>Joined (7d)</span>
        </li>
        <li className="stat">
          <b>{fmt.format(stats.membersJoined28d)}</b>
          <span>Joined (28d)</span>
        </li>
        <li className="stat">
          <b>{fmt.format(stats.activeMembers7d)}</b>
          <span>Active (7d)</span>
        </li>
        <li className="stat">
          <b>{fmt.format(stats.activeMembers28d)}</b>
          <span>Active (28d)</span>
        </li>
        <li className="stat">
          <b>{fmt.format(stats.saves7d)}</b>
          <span>Saves (7d)</span>
        </li>
        <li className="stat">
          <b>{fmt.format(stats.cooks7d)}</b>
          <span>Cooks (7d)</span>
        </li>
        <li className="stat">
          <b>{fmt.format(stats.newsletterTotal)}</b>
          <span>Newsletter</span>
        </li>
        <li className="stat">
          <b>{fmt.format(stats.newsletter7d)}</b>
          <span>Newsletter (7d)</span>
        </li>
      </ul>

      <section className="ga-card">
        <h3>Active members breakdown</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Active = unique members who saved a recipe or logged a cook in the period.
        </p>
        <ul className="admin-stats" style={{ marginBottom: 0 }}>
          <li className="stat">
            <b>{fmt.format(stats.activeSavers7d)}</b>
            <span>Savers (7d)</span>
          </li>
          <li className="stat">
            <b>{fmt.format(stats.activeCooks7d)}</b>
            <span>Cooks (7d)</span>
          </li>
          <li className="stat">
            <b>{fmt.format(stats.activeSavers28d)}</b>
            <span>Savers (28d)</span>
          </li>
          <li className="stat">
            <b>{fmt.format(stats.activeCooks28d)}</b>
            <span>Cooks (28d)</span>
          </li>
        </ul>
      </section>

      <div className="admin-members-grid">
        <section className="ga-card">
          <h3>Newest members</h3>
          {stats.recentMembers.length === 0 ? (
            <p className="muted">No members yet.</p>
          ) : (
            <ul className="rows">
              {stats.recentMembers.map((m) => (
                <li key={m.id} className="row">
                  <div>
                    <h3>{m.display_name || m.username || "Banana fan"}</h3>
                    <p className="muted">
                      {m.username ? `@${m.username}` : m.id.slice(0, 8)} · joined {shortDate(m.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ga-card">
          <h3>Recent member activity</h3>
          {stats.recentActivity.length === 0 ? (
            <p className="muted">No saves or cook logs yet.</p>
          ) : (
            <ul className="rows">
              {stats.recentActivity.map((a, i) => (
                <li key={`${a.kind}-${a.user_id}-${a.at}-${i}`} className="row">
                  <div>
                    <h3>
                      {a.display_name || a.username || "A member"}{" "}
                      <span className="muted" style={{ fontWeight: 700 }}>
                        {a.kind === "save" ? "saved" : "cooked"}
                      </span>{" "}
                      {a.recipe_slug ? (
                        <Link href={`/recipes/${a.recipe_slug}`}>{a.recipe_title || "a recipe"}</Link>
                      ) : (
                        a.recipe_title || "a recipe"
                      )}
                    </h3>
                    <p className="muted">{shortDate(a.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
