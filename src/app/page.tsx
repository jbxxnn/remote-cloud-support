import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    if ((session.user as any).role === "admin") {
      redirect("/admin");
    } else if ((session.user as any).role === "staff") {
      redirect("/staff");
    }
  }
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
    <div className="w-full max-w-sm">
      <LoginForm />
    </div>
  </div>
  )
}
