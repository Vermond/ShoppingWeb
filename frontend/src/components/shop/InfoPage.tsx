"use client";

import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { Button } from "@mui/material";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useCart } from "./CartProvider";
import { SiteHeader } from "./SiteHeader";
import styles from "./infoPage.module.css";

export type InfoSection = {
  title: string;
  body: string;
  points?: string[];
};

type InfoPageProps = {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: InfoSection[];
  collapsible?: boolean;
};

export function InfoPage({
  eyebrow,
  title,
  intro,
  sections,
  collapsible = false,
}: InfoPageProps) {
  const [query, setQuery] = useState("");
  const { totalItems } = useCart();

  return (
    <div className={styles.infoPage}>
      <SiteHeader
        activeSection={null}
        cartCount={totalItems}
        query={query}
        onQueryChange={setQuery}
      />
      <main className={styles.infoMain}>
        <Button
          className={styles.backButton}
          component={Link}
          href="/"
          startIcon={<ArrowBack />}
          disableRipple
        >
          Morrow 홈
        </Button>
        <section className={styles.infoHero} aria-labelledby="info-title">
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id="info-title">{title}</h1>
          <p>{intro}</p>
        </section>
        <section className={styles.infoList} aria-label={title}>
          {sections.map((section) =>
            collapsible ? (
              <details className={styles.infoItem} key={section.title}>
                <summary>
                  <span>{section.title}</span>
                  <ArrowForward />
                </summary>
                <div className={styles.infoBody}>
                  <p>{section.body}</p>
                  {section.points && (
                    <ul>
                      {section.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            ) : (
              <article className={styles.infoItem} key={section.title}>
                <h2>{section.title}</h2>
                <div className={styles.infoBody}>
                  <p>{section.body}</p>
                  {section.points && (
                    <ul>
                      {section.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ),
          )}
        </section>
        <Button
          className={styles.shopLink}
          component={Link}
          href="/shop"
          disableRipple
          endIcon={<ArrowForward />}
        >
          상품 둘러보기
        </Button>
      </main>
    </div>
  );
}
