import type { ReactNode } from "react";
import { requireAuthenticatedUser } from "../../components/auth/require-auth";

export const dynamic = "force-dynamic";

type CheckoutLayoutProps = {
  children: ReactNode;
};

export default async function CheckoutLayout({
  children,
}: CheckoutLayoutProps) {
  await requireAuthenticatedUser();

  return children;
}
