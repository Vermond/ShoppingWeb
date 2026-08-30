"use client";

import { ArrowForward } from "@mui/icons-material";
import { Button, TextField } from "@mui/material";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuth } from "../../../components/auth/AuthProvider";
import {
  AuthRequestError,
  requestPasswordResetConfirm,
} from "../../../repositories/auth.repository";
import styles from "../../login/page.module.css";

const minimumPasswordLength = 8;

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

type ResetError = {
  message: string;
  tokenUnavailable: boolean;
};

function getResetError(error: unknown): ResetError {
  if (error instanceof AuthRequestError) {
    switch (error.code) {
      case "PASSWORD_RESET_TOKEN_INVALID":
        return {
          message: "비밀번호 재설정 링크가 유효하지 않아요.",
          tokenUnavailable: true,
        };
      case "PASSWORD_RESET_TOKEN_USED":
        return {
          message: "이미 사용한 비밀번호 재설정 링크예요.",
          tokenUnavailable: true,
        };
      case "PASSWORD_RESET_TOKEN_EXPIRED":
        return {
          message: "비밀번호 재설정 링크가 만료됐어요.",
          tokenUnavailable: true,
        };
      case "PASSWORD_REUSE_NOT_ALLOWED":
        return {
          message: "기존 비밀번호와 다른 비밀번호를 사용해주세요.",
          tokenUnavailable: false,
        };
      default:
        break;
    }

    if (error.status === 410) {
      return {
        message: "비밀번호 재설정 링크가 만료됐어요.",
        tokenUnavailable: true,
      };
    }
  }

  return {
    message:
      error instanceof Error
        ? error.message
        : "비밀번호를 변경하지 못했어요.",
    tokenUnavailable: false,
  };
}

export default function ResetPasswordForm({ token }: { token: string }) {
  const { clearSession } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isTokenUnavailable, setIsTokenUnavailable] = useState(false);

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsTokenUnavailable(false);

    if (newPassword.length < minimumPasswordLength) {
      setFeedback({
        tone: "error",
        message: `비밀번호는 ${minimumPasswordLength}자 이상이어야 합니다.`,
      });
      return;
    }

    if (newPassword !== passwordConfirmation) {
      setFeedback({
        tone: "error",
        message: "새 비밀번호가 서로 일치하지 않아요.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await requestPasswordResetConfirm(token, newPassword);
      clearSession();
      setIsCompleted(true);
      setFeedback({
        tone: "success",
        message: result.message,
      });
    } catch (error) {
      const resetError = getResetError(error);

      setIsTokenUnavailable(resetError.tokenUnavailable);
      setFeedback({
        tone: "error",
        message: resetError.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <div className={styles.loginForm}>
        {feedback && (
          <p
            className={`${styles.feedback} ${styles[feedback.tone]}`}
            role="status"
          >
            {feedback.message}
          </p>
        )}
        <Button
          className={styles.emailButton}
          component={Link}
          href="/login"
          variant="contained"
          disableRipple
          endIcon={<ArrowForward />}
        >
          로그인하기
        </Button>
      </div>
    );
  }

  return (
    <>
      <form className={styles.loginForm} onSubmit={submitReset}>
        <TextField
          fullWidth
          label="새 비밀번호"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          required
          variant="standard"
          slotProps={{
            htmlInput: { minLength: minimumPasswordLength },
            inputLabel: { shrink: true },
          }}
        />
        <TextField
          fullWidth
          label="새 비밀번호 확인"
          type="password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          autoComplete="new-password"
          required
          variant="standard"
          slotProps={{
            htmlInput: { minLength: minimumPasswordLength },
            inputLabel: { shrink: true },
          }}
        />
        <Button
          className={styles.emailButton}
          type="submit"
          variant="contained"
          disableRipple
          disabled={isSubmitting || isTokenUnavailable}
          endIcon={!isSubmitting && <ArrowForward />}
        >
          {isSubmitting ? "변경 중..." : "비밀번호 변경하기"}
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

      {isTokenUnavailable && (
        <Button
          className={styles.emailButton}
          component={Link}
          href="/forgot-password"
          variant="contained"
          disableRipple
          endIcon={<ArrowForward />}
          sx={{ marginTop: "20px" }}
        >
          새 재설정 링크 요청하기
        </Button>
      )}
    </>
  );
}
