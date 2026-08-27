"use client";

import { Button, TextField } from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { requestResendVerification } from "../../../repositories/auth.repository";
import styles from "../../login/page.module.css";

type VerifyEmailActionsProps = {
  initialEmail: string;
  showEmailInput: boolean;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

export default function VerifyEmailActions({
  initialEmail,
  showEmailInput,
}: VerifyEmailActionsProps) {
  const [email, setEmail] = useState(initialEmail);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resendVerification = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setFeedback({
        tone: "error",
        message: "이메일 주소를 입력해주세요.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await requestResendVerification(normalizedEmail);
      setFeedback({ tone: "success", message: result.message });
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "인증 메일을 다시 보내지 못했어요.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {showEmailInput && (
        <TextField
          fullWidth
          label="이메일"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          variant="standard"
          slotProps={{ inputLabel: { shrink: true } }}
        />
      )}
      <Button
        className={styles.emailButton}
        type="button"
        variant="contained"
        disableRipple
        disabled={isSubmitting}
        onClick={resendVerification}
      >
        {isSubmitting ? "다시 보내는 중..." : "인증 메일 다시 보내기"}
      </Button>
      <Button
        className={styles.homeLink}
        component={Link}
        href="/login"
        disableRipple
      >
        로그인으로 이동
      </Button>
      {feedback && (
        <p
          className={`${styles.feedback} ${styles[feedback.tone]}`}
          role="status"
        >
          {feedback.message}
        </p>
      )}
    </>
  );
}
