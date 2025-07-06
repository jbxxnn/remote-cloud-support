import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { ClientManagement } from "./client-management";

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={session.user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ClientManagement user={session.user} />
      </div>
    </div>
  );
} 