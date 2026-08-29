import { ArrowBack } from "@mui/icons-material";
import { Button } from "@mui/material";
import Link from "next/link";
import { getLoginPath, getSafeReturnTo } from "../../../utils/auth-redirect";
import VerifyEmailActions from "../verify-email/verify-email-actions";
import styles from "../../login/page.module.css";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  email?: string | string[];
  returnTo?: string | string[];
}>;

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VerificationRequiredPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const email = getSearchParam(params.email);
  const returnTo = getSafeReturnTo(getSearchParam(params.returnTo));

  return (
    <div className={styles.loginPage}>
      <header className={styles.loginHeader}>
        <Link className={styles.logo} href="/" aria-label="Morrow 홈으로 이동">
          MORROW<span>.</span>
        </Link>
        <Button
          className={styles.homeLink}
          href={getLoginPath(returnTo)}
          disableRipple
          startIcon={<ArrowBack />}
        >
          로그인으로 돌아가기
        </Button>
      </header>

      <main className={styles.loginMain}>
        <section
          className={styles.loginPanel}
          aria-labelledby="verification-required-title"
        >
          <p className={styles.eyebrow}>One more step</p>
          <h1 id="verification-required-title">
            이메일 인증이
            <br />
            <em>필요해요.</em>
          </h1>
          <p className={styles.loginDescription}>
            {email ? <strong>{email}</strong> : "가입하신 이메일"} 인증을 완료한
            뒤 로그인할 수 있어요.
            <br />
            인증 메일을 확인하거나 다시 요청해주세요.
          </p>
          <div className={styles.loginForm}>
            <VerifyEmailActions
              initialEmail={email ?? ""}
              showEmailInput={!email}
              returnTo={returnTo}
            />
          </div>
        </section>
        <aside className={styles.loginVisual} aria-hidden="true" />
      </main>
    </div>
  );
}
