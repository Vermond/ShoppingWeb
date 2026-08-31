import type { ReactNode } from "react";
import { requireAuthenticatedUser } from "../../components/auth/require-auth";

export const dynamic = "force-dynamic";

type OrdersLayoutProps = {
  children: ReactNode;
};

export default async function OrdersLayout({
  children,
}: OrdersLayoutProps) {
  await requireAuthenticatedUser("/orders");

  return children;
}
