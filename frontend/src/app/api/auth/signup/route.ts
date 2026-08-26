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
    password?: unknown;
  } | null;

  if (
    !requestBody ||
    typeof requestBody.name !== "string" ||
    typeof requestBody.email !== "string" ||
    typeof requestBody.password !== "string" ||
    !requestBody.name.trim() ||
    !requestBody.email.includes("@") ||
    requestBody.password.length < 8
  ) {
    return Response.json(
      { error: "이름, 이메일과 8자 이상의 비밀번호를 확인해주세요." },
      { status: 400 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 450));

  return Response.json({
    message: "회원가입 목업이 완료되었어요. 이제 로그인할 수 있습니다.",
  });
}
