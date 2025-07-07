import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffDashboard } from "./staff-dashboard";

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/login");
  }

  // Check if user has staff role
  if ((session.user as any).role !== "staff") {
    redirect("/admin"); // Redirect to admin if not staff
  }

  return <StaffDashboard user={session.user} />;
} 