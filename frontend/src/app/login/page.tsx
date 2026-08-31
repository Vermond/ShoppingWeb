"use client";

import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { Button, TextField } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "../../components/auth/AuthProvider";
import {
  AuthRequestError,
  requestLogin,
} from "../../repositories/auth.repository";
import { getLoginReturnTo } from "../../utils/auth-redirect";
import styles from "./page.module.css";

type Feedback = {
  message: string;
} | null;

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const submitLogin = async (payload: Parameters<typeof requestLogin>[0]) => {
    setIsSubmitting(true);
    setFeedback(null);
    const returnTo = getLoginReturnTo();

    try {
      const result = await requestLogin(payload);
      signIn(result.user);
      router.replace(returnTo);
    } catch (error) {
      if (
        error instanceof AuthRequestError &&
        error.code === "EMAIL_NOT_VERIFIED"
      ) {
        const verificationParams = new URLSearchParams({
          email: payload.email,
        });

        if (returnTo !== "/") {
          verificationParams.set("returnTo", returnTo);
        }

        router.replace(
          `/auth/verification-required?${verificationParams.toString()}`,
        );
        return;
      }

      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "로그인 중 문제가 발생했어요.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitLogin({ method: "email", email, password });
  };

  return (
    <div className={styles.loginPage}>
      <header className={styles.loginHeader}>
        <Link className={styles.logo} href="/" aria-label="Morrow 홈으로 이동">
          MORROW<span>.</span>
        </Link>
        <Button
          className={styles.homeLink}
          component={Link}
          href="/"
          disableRipple
          startIcon={<ArrowBack />}
        >
          홈으로 돌아가기
        </Button>
      </header>

      <main className={styles.loginMain}>
        <section className={styles.loginPanel} aria-labelledby="login-title">
          <p className={styles.eyebrow}>Welcome back</p>
          <h1 id="login-title">
            다시 만나요.
            <br />
            <em>천천히, 오래.</em>
          </h1>
          <p className={styles.loginDescription}>
            좋아하는 물건을 저장하고,
            <br />
            다음 쇼핑을 더 편안하게 이어가세요.
          </p>

          {feedback && (
            <p
              className={styles.feedback}
              role="status"
            >
              {feedback.message}
            </p>
          )}

          <form className={styles.loginForm} onSubmit={handleEmailLogin}>
            <TextField
              fullWidth
              label="이메일"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              required
              variant="standard"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              sx={{
                "& .MuiInputLabel-root": {
                  color: "var(--morrow-palette-text-secondary)",
                  fontSize: "12px",
                },
                "& .MuiInput-root": {
                  fontSize: "14px",
                },
              }}
            />
            <TextField
              fullWidth
              label="비밀번호"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              variant="standard"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              sx={{
                "& .MuiInputLabel-root": {
                  color: "var(--morrow-palette-text-secondary)",
                  fontSize: "12px",
                },
                "& .MuiInput-root": {
                  fontSize: "14px",
                },
              }}
            />
            <Button
              className={styles.emailButton}
              type="submit"
              variant="contained"
              disableRipple
              disabled={isSubmitting}
              endIcon={!isSubmitting && <ArrowForward />}
            >
              {isSubmitting ? "확인 중..." : "이메일로 로그인"}
            </Button>
          </form>

          <div className={styles.authLinks}>
            <Link href="/signup">회원가입</Link>
            <Link href="/forgot-password">비밀번호 찾기</Link>
          </div>
        </section>

        <aside className={styles.loginVisual} aria-label="Morrow의 오브젝트">
          <div className={styles.visualSun} />
          <div className={styles.visualVase}>
            <span />
          </div>
          <div className={styles.visualBranch}>
            <i />
            <i />
            <i />
          </div>
          <p>MAKE ROOM FOR<br />GOOD THINGS.</p>
          <strong>01</strong>
        </aside>
      </main>
    </div>
  );
}
