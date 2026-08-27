import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireAuthenticatedUser } from "../../components/auth/require-auth";

export const dynamic = "force-dynamic";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const user = await requireAuthenticatedUser();

  if (user.role?.trim().toLowerCase() !== "admin") {
    redirect("/");
  }

  return children;
}
