import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { Button } from "@mui/material";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AuthRequestError,
  type EmailVerificationResponse,
} from "../../../repositories/auth.repository";
import { requestVerifyEmailOnServer } from "../../../repositories/auth.server.repository";
import VerifyEmailActions from "./verify-email-actions";
import styles from "../../login/page.module.css";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  email?: string | string[];
  status?: string | string[];
  token?: string | string[];
}>;

type VerificationStatus =
  | "waiting"
  | "success"
  | "already"
  | "expired"
  | "invalid"
  | "missing"
  | "unavailable";

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isVerificationStatus(
  value: string | undefined,
): value is VerificationStatus {
  return (
    value === "waiting" ||
    value === "success" ||
    value === "already" ||
    value === "expired" ||
    value === "invalid" ||
    value === "missing" ||
    value === "unavailable"
  );
}

function getStatusFromError(error: unknown): VerificationStatus {
  if (error instanceof AuthRequestError) {
    if (error.status === 410) {
      return "expired";
    }

    if (error.status === 400) {
      return "invalid";
    }
  }

  return "unavailable";
}

function getCleanUrl(
  status: VerificationStatus,
  email: string | undefined,
) {
  const params = new URLSearchParams({ status });

  if (email) {
    params.set("email", email);
  }

  return `/auth/verify-email?${params.toString()}`;
}

async function verifyToken(token: string): Promise<VerificationStatus> {
  try {
    const result: EmailVerificationResponse =
      await requestVerifyEmailOnServer(token);

    return result.code === "EMAIL_ALREADY_VERIFIED" ? "already" : "success";
  } catch (error) {
    return getStatusFromError(error);
  }
}

function getTitle(status: VerificationStatus) {
  switch (status) {
    case "success":
      return (
        <>
          이메일 인증이
          <br />
          <em>완료됐어요.</em>
        </>
      );
    case "already":
      return (
        <>
          이미 인증된
          <br />
          <em>이메일이에요.</em>
        </>
      );
    case "expired":
      return (
        <>
          인증 링크가
          <br />
          <em>만료됐어요.</em>
        </>
      );
    case "invalid":
      return (
        <>
          인증 링크를
          <br />
          <em>확인해주세요.</em>
        </>
      );
    case "missing":
      return (
        <>
          인증 링크를
          <br />
          <em>찾을 수 없어요.</em>
        </>
      );
    case "unavailable":
      return (
        <>
          잠시 후
          <br />
          <em>다시 시도해주세요.</em>
        </>
      );
    case "waiting":
      return (
        <>
          메일을
          <br />
          <em>확인해주세요.</em>
        </>
      );
  }
}

function getDescription(status: VerificationStatus, email?: string) {
  switch (status) {
    case "success":
      return (
        <>
          이메일 인증이 완료되었습니다.
          <br />
          이제 Morrow를 이용할 수 있어요.
        </>
      );
    case "already":
      return (
        <>
          이 이메일은 이미 인증되어 있어요.
          <br />
          로그인하고 쇼핑을 이어가세요.
        </>
      );
    case "expired":
      return (
        <>
          인증 링크의 유효 시간이 지났어요.
          <br />
          {email
            ? "인증 메일을 다시 보내주세요."
            : "이메일을 입력해 다시 받아주세요."}
        </>
      );
    case "invalid":
      return (
        <>
          유효하지 않거나 이미 사용할 수 없는 링크예요.
          <br />
          이메일을 입력하면 새 인증 메일을 받을 수 있어요.
        </>
      );
    case "missing":
      return (
        <>
          이메일에서 받은 인증 링크로 접속해주세요.
          <br />
          링크가 없다면 로그인 화면에서 다시 요청할 수 있어요.
        </>
      );
    case "unavailable":
      return (
        <>
          인증 서버에 잠시 연결하지 못했어요.
          <br />
          원래 이메일 링크를 잠시 후 다시 열어주세요.
        </>
      );
    case "waiting":
      return (
        <>
          {email ? <strong>{email}</strong> : "입력하신 이메일"}로 인증 링크를
          보냈어요.
          <br />
          링크는 24시간 동안 유효합니다.
        </>
      );
  }
}

function getAction(status: VerificationStatus, email?: string) {
  if (
    status === "waiting" ||
    status === "expired" ||
    status === "invalid"
  ) {
    return (
      <VerifyEmailActions
        initialEmail={email ?? ""}
        showEmailInput={!email}
      />
    );
  }

  if (status === "success" || status === "already") {
    return (
      <Button
        className={styles.emailButton}
        href="/login"
        variant="contained"
        disableRipple
        endIcon={<ArrowForward />}
      >
        로그인하기
      </Button>
    );
  }

  return (
    <Button
      className={styles.emailButton}
      href="/login"
      variant="contained"
      disableRipple
      endIcon={<ArrowForward />}
    >
      로그인으로 이동
    </Button>
  );
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const token = getSearchParam(params.token);
  const email = getSearchParam(params.email);
  const requestedStatus = getSearchParam(params.status);

  let status: VerificationStatus;

  if (token) {
    status = await verifyToken(token);
    redirect(getCleanUrl(status, email));
  }

  status = isVerificationStatus(requestedStatus)
    ? requestedStatus
    : email
      ? "waiting"
      : "missing";

  return (
    <div className={styles.loginPage}>
      <header className={styles.loginHeader}>
        <Link className={styles.logo} href="/" aria-label="Morrow 홈으로 이동">
          MORROW<span>.</span>
        </Link>
        <Button
          className={styles.homeLink}
          href="/login"
          disableRipple
          startIcon={<ArrowBack />}
        >
          로그인으로 돌아가기
        </Button>
      </header>

      <main className={styles.loginMain}>
        <section className={styles.loginPanel} aria-labelledby="verify-title">
          <p className={styles.eyebrow}>Check your inbox</p>
          <h1 id="verify-title">{getTitle(status)}</h1>
          <p className={styles.loginDescription}>
            {getDescription(status, email)}
          </p>
          <div className={styles.loginForm}>{getAction(status, email)}</div>
        </section>
        <aside className={styles.loginVisual} aria-hidden="true" />
      </main>
    </div>
  );
}
