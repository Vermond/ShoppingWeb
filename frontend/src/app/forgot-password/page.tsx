"use client";

import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { Button, TextField } from "@mui/material";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { requestPasswordReset } from "../../repositories/auth.repository";
import styles from "../login/page.module.css";

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await requestPasswordReset(email);
      setFeedback({
        tone: "success",
        message: result.message ?? "재설정 안내를 보냈어요.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "요청에 실패했어요.",
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
        <section className={styles.loginPanel} aria-labelledby="reset-title">
          <p className={styles.eyebrow}>Find your way back</p>
          <h1 id="reset-title">
            다시 만날
            <br />
            <em>준비를 해요.</em>
          </h1>
          <p className={styles.loginDescription}>
            가입한 이메일을 입력하면
            <br />
            비밀번호 재설정 안내를 보내드릴게요.
          </p>
          <form className={styles.loginForm} onSubmit={submitReset}>
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
            <Button
              className={styles.emailButton}
              type="submit"
              variant="contained"
              disableRipple
              disabled={isSubmitting}
              endIcon={!isSubmitting && <ArrowForward />}
            >
              {isSubmitting ? "보내는 중..." : "재설정 안내 받기"}
            </Button>
          </form>
          {feedback && (
            <p
              className={`${styles.feedback} ${styles[feedback.tone]}`}
              role={feedback.tone === "error" ? "alert" : "status"}
            >
              {feedback.message}
            </p>
          )}
        </section>
        <aside className={styles.loginVisual} aria-hidden="true" />
      </main>
    </div>
  );
}
