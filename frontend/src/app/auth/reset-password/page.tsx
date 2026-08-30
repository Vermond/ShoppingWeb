import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { Button } from "@mui/material";
import Link from "next/link";
import ResetPasswordForm from "./reset-password-form";
import styles from "../../login/page.module.css";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  token?: string | string[];
}>;

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const token = getSearchParam(params.token);

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
        <section className={styles.loginPanel} aria-labelledby="reset-title">
          <p className={styles.eyebrow}>Reset your password</p>
          <h1 id="reset-title">
            {token ? (
              <>
                새 비밀번호를
                <br />
                <em>정해주세요.</em>
              </>
            ) : (
              <>
                재설정 링크를
                <br />
                <em>확인해주세요.</em>
              </>
            )}
          </h1>
          <p className={styles.loginDescription}>
            {token ? (
              <>
                새로운 비밀번호를 입력하면
                <br />
                다시 로그인할 수 있어요.
              </>
            ) : (
              <>
                이메일 링크를 통해 접속해야
                <br />
                비밀번호를 변경할 수 있어요.
              </>
            )}
          </p>

          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className={styles.loginForm}>
              <p className={`${styles.feedback} ${styles.error}`} role="alert">
                유효한 비밀번호 재설정 링크가 없어요.
              </p>
              <Button
                className={styles.emailButton}
                href="/forgot-password"
                variant="contained"
                disableRipple
                endIcon={<ArrowForward />}
              >
                재설정 링크 요청하기
              </Button>
            </div>
          )}
        </section>
        <aside className={styles.loginVisual} aria-hidden="true" />
      </main>
    </div>
  );
}
