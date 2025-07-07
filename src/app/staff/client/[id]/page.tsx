import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClientDashboard } from "./client-dashboard";

interface ClientPageProps {
  params: {
    id: string;
  };
}

export default async function ClientPage({ params }: ClientPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/login");
  }

  // Check if user has staff role
  if ((session.user as any).role !== "staff") {
    redirect("/admin");
  }

  return <ClientDashboard clientId={params.id} user={session.user} />;
} 