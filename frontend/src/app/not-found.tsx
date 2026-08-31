import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="Morrow 홈으로 이동">
          MORROW<span>.</span>
        </Link>
        <span className={styles.headerLabel}>Page not found</span>
      </header>

      <section className={styles.content} aria-labelledby="not-found-title">
        <div className={styles.ornament} aria-hidden="true">
          <span className={styles.ornamentCircle} />
          <span className={styles.ornamentLine} />
          <span className={styles.ornamentDot} />
        </div>

        <p className={styles.eyebrow}>A quiet little detour</p>
        <p className={styles.errorCode}>404</p>
        <h1 id="not-found-title">
          찾으시는 페이지가
          <br />
          <em>잠시 숨었어요.</em>
        </h1>
        <p className={styles.description}>
          주소가 바뀌었거나 더 이상 존재하지 않는 페이지입니다.
          <br />
          Morrow의 첫 화면으로 돌아가 천천히 둘러보세요.
        </p>
        <Link className={styles.homeLink} href="/">
          홈으로 돌아가기 <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <span>© 2025 MORROW STUDIO</span>
        <span>Seoul, Korea</span>
      </footer>
    </main>
  );
}
