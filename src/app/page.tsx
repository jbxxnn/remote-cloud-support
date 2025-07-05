import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    if (session.user.role === "admin") {
      redirect("/admin");
    } else if (session.user.role === "staff") {
      redirect("/dashboard");
    }
  }
  return <LoginForm />;
}
