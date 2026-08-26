export async function requestNewsletterSignup(email: string) {
  const response = await fetch("/api/newsletter", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  const result = (await response.json()) as { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "뉴스레터 신청을 처리하지 못했어요.");
  }

  return result;
}
