"use client";

import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { Button, TextField } from "@mui/material";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { requestSignup } from "../../repositories/auth.repository";
import styles from "../login/page.module.css";

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== passwordConfirm) {
      setFeedback({ tone: "error", message: "비밀번호가 서로 다릅니다." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await requestSignup({ name, email, password });
      setFeedback({
        tone: "success",
        message: result.message ?? "회원가입이 완료되었어요.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error ? error.message : "회원가입에 실패했어요.",
      });
    } finally {
      setIsSubmitting(false);
    }
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
          href="/login"
          disableRipple
          startIcon={<ArrowBack />}
        >
          로그인으로 돌아가기
        </Button>
      </header>

      <main className={styles.loginMain}>
        <section className={styles.loginPanel} aria-labelledby="signup-title">
          <p className={styles.eyebrow}>Join Morrow</p>
          <h1 id="signup-title">
            좋은 물건을
            <br />
            <em>더 오래.</em>
          </h1>
          <p className={styles.loginDescription}>
            회원이 되면 찜한 물건과 주문 내역을
            <br />
            한 곳에서 편하게 관리할 수 있어요.
          </p>
          <form className={styles.loginForm} onSubmit={submitSignup}>
            <TextField
              fullWidth
              label="이름"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              variant="standard"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth
              label="이메일"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              variant="standard"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth
              label="비밀번호"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              helperText="8자 이상 입력해주세요."
              required
              variant="standard"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth
              label="비밀번호 확인"
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              required
              variant="standard"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button
              className={styles.emailButton}
              type="submit"
              variant="contained"
              disableRipple
              disabled={isSubmitting}
              endIcon={!isSubmitting && <ArrowForward />}
            >
              {isSubmitting ? "가입 처리 중..." : "회원가입"}
            </Button>
          </form>
          {feedback && (
            <p className={`${styles.feedback} ${styles[feedback.tone]}`} role="status">
              {feedback.message}
            </p>
          )}
          <p className={styles.mockNotice}>
            회원가입은 서버 연결 전 목업으로 동작합니다.
          </p>
        </section>
        <aside className={styles.loginVisual} aria-hidden="true" />
      </main>
    </div>
  );
}
