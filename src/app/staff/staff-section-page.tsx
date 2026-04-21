import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { StaffDashboard } from "./staff-dashboard";

interface StaffSectionPageProps {
  section?: string;
}

export async function StaffSectionPage({ section = "dashboard" }: StaffSectionPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  if ((session.user as any).role !== "staff") {
    redirect("/admin");
  }

  return <StaffDashboard user={session.user} initialSection={section} />;
}
