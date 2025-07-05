import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "staff") {
    redirect("/");
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p>Welcome, {session.user.name} (Staff)</p>
    </div>
  );
} 