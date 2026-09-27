import type { Metadata } from "next";
import { getHomepagePromo } from "@/lib/queries";
import { HomepagePromoForm } from "@/components/HomepagePromoForm";

export const metadata: Metadata = { title: "Admin · Homepage promo" };

export default async function AdminHomepagePage() {
  const promo = await getHomepagePromo();
  return (
    <>
      <div className="page-head" style={{ paddingTop: 0 }}>
        <h2>Homepage promo</h2>
        <p className="lede">Edit the full-width band between the hero and “Fresh from the kitchen.” Copy and the button show on hover.</p>
      </div>
      <HomepagePromoForm initial={promo} />
    </>
  );
}
