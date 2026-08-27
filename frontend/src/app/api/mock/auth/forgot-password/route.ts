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
    message: "비밀번호 재설정 안내 메일 목업을 보냈어요.",
  });
}
