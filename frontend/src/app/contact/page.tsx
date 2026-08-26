"use client";

import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { Button, TextField } from "@mui/material";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useCart } from "../../components/shop/CartProvider";
import { SiteHeader } from "../../components/shop/SiteHeader";
import { requestContact } from "../../repositories/contact.repository";
import styles from "./page.module.css";

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

export default function ContactPage() {
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { totalItems } = useCart();

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await requestContact({ name, email, message });
      setFeedback({
        tone: "success",
        message: result.message ?? "문의가 접수되었어요.",
      });
      setMessage("");
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error ? error.message : "문의 접수에 실패했어요.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.contactPage}>
      <SiteHeader
        activeSection={null}
        cartCount={totalItems}
        query={query}
        onQueryChange={setQuery}
      />
      <main className={styles.contactMain}>
        <Button
          className={styles.backButton}
          component={Link}
          href="/"
          startIcon={<ArrowBack />}
          disableRipple
        >
          Morrow 홈
        </Button>
        <section className={styles.contactHero} aria-labelledby="contact-title">
          <p className={styles.eyebrow}>Help / Contact</p>
          <h1 id="contact-title">
            이야기를
            <br />
            <em>남겨주세요.</em>
          </h1>
          <p>
            상품과 주문에 관한 질문부터
            <br />
            Morrow에 전하고 싶은 이야기까지 편하게 들려주세요.
          </p>
        </section>

        <section className={styles.contactLayout} aria-label="문의 작성">
          <div className={styles.contactCopy}>
            <p className={styles.eyebrow}>We are listening</p>
            <h2>천천히 확인하고<br />정성껏 답할게요.</h2>
            <p>영업일 기준 1~2일 안에 입력해주신 이메일로 답변드려요.</p>
          </div>
          <form className={styles.contactForm} onSubmit={submitContact}>
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
              label="문의 내용"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              multiline
              minRows={5}
              variant="standard"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button
              className={styles.submitButton}
              type="submit"
              variant="contained"
              disableRipple
              disabled={isSubmitting}
              endIcon={!isSubmitting && <ArrowForward />}
            >
              {isSubmitting ? "접수 중..." : "문의 보내기"}
            </Button>
            {feedback && (
              <p className={`${styles.feedback} ${styles[feedback.tone]}`} role="status">
                {feedback.message}
              </p>
            )}
          </form>
        </section>
        <p className={styles.mockNote}>
          문의 접수는 서버 연결 전 목업으로 동작합니다.
        </p>
      </main>
    </div>
  );
}
