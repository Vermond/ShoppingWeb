import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requestCurrentUserOnServer } from "../../repositories/auth.server.repository";

export const dynamic = "force-dynamic";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    redirect("/login");
  }

  let user;

  try {
    user = await requestCurrentUserOnServer(cookieHeader);
  } catch {
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  if (user.role?.trim().toLowerCase() !== "admin") {
    redirect("/");
  }

  return children;
}
