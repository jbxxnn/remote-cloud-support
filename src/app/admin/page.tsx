import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";
import ClientManagement from "./client-management";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!session || !session.user || (session.user as any).role !== "admin") {
    redirect("/");
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="absolute top-4 right-4">
        <LogoutButton />
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome, {session.user.name} (Admin)</p>
          </div>
          <div className="flex space-x-4">
            <a
              href="/detections"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              📊 Detection Dashboard
            </a>
          </div>
        </div>
        <ClientManagement />
      </div>
    </div>
  );
} 