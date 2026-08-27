export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const requestBody = body as { email?: unknown } | null;

  if (
    !requestBody ||
    typeof requestBody.email !== "string" ||
    !requestBody.email.includes("@")
  ) {
    return Response.json(
      { error: "이메일 주소를 확인해주세요." },
      { status: 400 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 450));

  return Response.json({
    message: "뉴스레터 신청이 완료되었어요. 다음 소식에서 만나요.",
  });
}
