import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { ComplianceDashboard } from "./compliance-dashboard";

export default async function CompliancePage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={session.user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ComplianceDashboard user={session.user} />
      </div>
    </div>
  );
}



