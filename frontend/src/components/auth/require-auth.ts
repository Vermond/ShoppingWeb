import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthUser } from "../../repositories/auth.repository";
import { requestCurrentUserOnServer } from "../../repositories/auth.server.repository";

export async function requireAuthenticatedUser(): Promise<AuthUser> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    redirect("/login");
  }

  try {
    const user = await requestCurrentUserOnServer(cookieHeader);

    if (user) {
      return user;
    }
  } catch {
    // 인증 서버에 연결할 수 없는 경우에도 보호된 화면을 노출하지 않습니다.
  }

  redirect("/login");
}
