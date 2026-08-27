export type ContactRequest = {
  name: string;
  email: string;
  message: string;
};

export async function requestContact(payload: ContactRequest) {
  const response = await fetch("/api/mock/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = (await response.json()) as { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "문의를 접수하지 못했어요.");
  }

  return result;
}
