import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · Newsletter" };

export default async function AdminNewsletterPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("newsletter_signups")
    .select("id, email, source, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = data ?? [];

  return (
    <>
      <div className="sec-head">
        <div>
          <h2>Newsletter</h2>
          <p>
            {rows.length
              ? `${rows.length} signup${rows.length === 1 ? "" : "s"} from the site footer.`
              : "No newsletter signups yet."}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <p>When someone joins from the footer, they&apos;ll show up here.</p>
        </div>
      ) : (
        <ul className="rows">
          {rows.map((r) => (
            <li key={r.id} className="row">
              <div>
                <h3>
                  <a href={`mailto:${r.email}`}>{r.email}</a>
                </h3>
                <p>
                  {shortDate(r.created_at)}
                  {r.source ? ` · ${r.source}` : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
