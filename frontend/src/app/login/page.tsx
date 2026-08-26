"use client";

import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { Button, TextField } from "@mui/material";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  requestLogin,
  socialProviders,
  type SocialProvider,
} from "../../repositories/auth.repository";
import styles from "./page.module.css";

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const submitLogin = async (payload: Parameters<typeof requestLogin>[0]) => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await requestLogin(payload);
      setFeedback({ tone: "success", message: result.message });
    } catch (error) {
      setFeedback({
        tone: "error",
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

  const handleSocialLogin = async (provider: SocialProvider) => {
    await submitLogin({ method: "social", provider });
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

          <div className={styles.divider}>
            <span>또는</span>
          </div>

          <div className={styles.socialList}>
            {socialProviders.map(({ id, label }) => (
              <Button
                className={`${styles.socialButton} ${styles[id]}`}
                key={id}
                type="button"
                variant="outlined"
                disableRipple
                disabled={isSubmitting}
                onClick={() => handleSocialLogin(id)}
                startIcon={<span className={styles.socialMark}>{id[0].toUpperCase()}</span>}
              >
                {label}로 계속하기
              </Button>
            ))}
          </div>

          {feedback && (
            <p
              className={`${styles.feedback} ${styles[feedback.tone]}`}
              role="status"
            >
              {feedback.message}
            </p>
          )}

          <p className={styles.mockNotice}>
            현재 로그인 기능은 서버 연결 전 목업으로 동작합니다.
          </p>
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
