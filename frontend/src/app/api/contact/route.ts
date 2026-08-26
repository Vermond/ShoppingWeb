export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const requestBody = body as {
    name?: unknown;
    email?: unknown;
    message?: unknown;
  } | null;

  if (
    !requestBody ||
    typeof requestBody.name !== "string" ||
    typeof requestBody.email !== "string" ||
    typeof requestBody.message !== "string" ||
    !requestBody.name.trim() ||
    !requestBody.email.includes("@") ||
    requestBody.message.trim().length < 10
  ) {
    return Response.json(
      { error: "이름, 이메일과 10자 이상의 문의 내용을 확인해주세요." },
      { status: 400 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 450));

  return Response.json({
    message: "문의가 접수되었어요. 목업 답변은 이메일로 안내드릴게요.",
  });
}
