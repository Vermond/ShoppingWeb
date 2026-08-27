import type { ReactNode } from "react";
import { requireAuthenticatedUser } from "../../components/auth/require-auth";

export const dynamic = "force-dynamic";

type OrderLayoutProps = {
  children: ReactNode;
};

export default async function OrderLayout({ children }: OrderLayoutProps) {
  await requireAuthenticatedUser();

  return children;
}
