import { Dashboard } from "@/components/dashboard";
import { getDashboardData } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getDashboardData();
  return <Dashboard initialData={data} />;
}
