import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { RCELogo } from "@/components/layout/rce-logo";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    const role = (session.user as any).role;
    if (role === "admin") {
      redirect("/admin");
    } else if (role === "staff") {
      redirect("/staff");
    } else {
      redirect("/tablet/monitor");
    }
  }
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
    <div className="w-full flex flex-col items-center justify-center max-w-sm gap-6">
    <RCELogo 
              variant="auto"
              showText={false}
              className="flex-shrink-0"
            />
      <LoginForm />
    </div>
  </div>
  )
}
