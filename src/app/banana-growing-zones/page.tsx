import type { Metadata } from "next";
import { BananaGrowingZones } from "@/components/BananaGrowingZones";

export const metadata: Metadata = {
  title: "Banana Growing Zones",
  description: "Find your USDA growing zone and see which banana varieties can live outdoors where you are.",
  alternates: { canonical: "/banana-growing-zones" },
  openGraph: {
    title: "Banana Growing Zones",
    description: "Find your USDA growing zone and see whether your favorite banana variety belongs outdoors or inside.",
    url: "/banana-growing-zones",
  },
};

export default function BananaGrowingZonesPage() {
  return (
    <div className="banana-zones-page">
      <div className="wrap banana-zones-wrap">
        <BananaGrowingZones />
      </div>
    </div>
  );
}
