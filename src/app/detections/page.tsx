import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DetectionDashboard from "./detection-dashboard";

export default async function DetectionsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "admin") {
    redirect("/");
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Real-Time Detection Dashboard</h1>
        <p className="text-center mb-8 text-gray-600">Live monitoring of all detection events</p>
        <DetectionDashboard />
      </div>
    </div>
  );
} 