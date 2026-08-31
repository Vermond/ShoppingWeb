"use client";

import {
  ArrowForward,
  ArrowUpward,
  Check,
  Close,
  LocalShippingOutlined,
} from "@mui/icons-material";
import { Button, IconButton } from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../components/shop/CartProvider";
import { useCatalog } from "../components/shop/CatalogProvider";
import { ProductSection } from "../components/shop/ProductSection";
import { SiteHeader } from "../components/shop/SiteHeader";
import type { ProductFilter } from "../types/catalog";
import styles from "./page.module.css";

export default function Home() {
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ProductFilter>("전체");
  const [query, setQuery] = useState("");
  const { totalItems, addItem } = useCart();
  const { categories, isLoading: isCatalogLoading } = useCatalog();

  useEffect(() => {
    if (isCatalogLoading || window.location.hash !== "#story") {
      return;
    }

    const storySection = document.getElementById("story");

    if (!storySection) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      storySection.scrollIntoView({ block: "start" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isCatalogLoading]);

  return (
    <div className={styles.page}>
      {showAnnouncement && (
        <div className={styles.announcement}>
          <span>첫 구매 고객을 위한 배송 혜택</span>
          <span className={styles.announcementDetail}>주문 금액에 따라 자동 적용</span>
          <IconButton
            type="button"
            size="small"
            disableRipple
            aria-label="공지 닫기"
            onClick={() => setShowAnnouncement(false)}
          >
            <Close />
          </IconButton>
        </div>
      )}

      <SiteHeader
        cartCount={totalItems}
        query={query}
        onQueryChange={setQuery}
      />

      <main id="top">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span /> Objects for a slower day
            </p>
            <h1>
              좋은 물건은
              <br />
              <em>시간을 닮아요.</em>
            </h1>
            <p className={styles.heroDescription}>
              매일 곁에 두고 오래 쓰는 것들.
              <br />
              Morrow는 일상에 조용한 기쁨을 더합니다.
            </p>
            <div className={styles.heroActions}>
              <Button
                className={styles.primaryButton}
                component="a"
                href="#new-arrivals"
                disableRipple
              >
                지금 둘러보기 <ArrowForward />
              </Button>
              <Button
                className={styles.textButton}
                component="a"
                href="#story"
                disableRipple
              >
                우리의 기준 <ArrowUpward />
              </Button>
            </div>
          </div>

          <div className={styles.heroVisual} aria-label="Morrow의 새로운 오브젝트 컬렉션">
            <div className={styles.heroSun} />
            <div className={styles.heroNote}>
              <span>01</span>
              <strong>
                quiet
                <br />
                objects
              </strong>
            </div>
            <div className={styles.heroProduct}>
              <div className={styles.heroProductShadow} />
              <div className={styles.heroVase}>
                <i />
                <b />
              </div>
              <div className={styles.heroBranch}>
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className={styles.heroPebble} />
            </div>
            <p className={styles.heroCaption}>
              SS 2025 / objects
              <br />
              to keep close
            </p>
            <span className={styles.heroVertical}>MORROW STUDIO — SEOUL</span>
          </div>
        </section>

        <section className={styles.serviceStrip} aria-label="Morrow 서비스 안내">
          <div>
            <LocalShippingOutlined />
            <span>
              <strong>배송비 안내</strong> 주문 전 정확히 안내
            </span>
          </div>
          <div>
            <Check />
            <span>
              <strong>검수 완료</strong> 모든 제품을 꼼꼼하게
            </span>
          </div>
          <div>
            <span className={styles.serviceNumber}>14</span>
            <span>
              <strong>14일 교환</strong> 편안한 쇼핑을 위해
            </span>
          </div>
        </section>

        <section className={styles.categorySection} id="categories">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Curated for everyday</p>
              <h2>무엇을 찾고 있나요?</h2>
            </div>
            <a className={styles.viewAll} href="#new-arrivals">
              전체 보기 <ArrowForward />
            </a>
          </div>

          <div className={styles.categoryGrid}>
            {categories.map((category) => (
              <Link
                href={`/shop?categoryId=${encodeURIComponent(category.id)}`}
                className={`${styles.categoryCard} ${styles[category.tone]}`}
                key={category.id}
              >
                <div className={styles.categoryArt} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles.categoryMeta}>
                  <div>
                    <h3>{category.name}</h3>
                    <span>{String(category.count).padStart(2, "0")} items</span>
                  </div>
                  <ArrowUpward />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <ProductSection
          activeFilter={activeFilter}
          query={query}
          onFilterChange={setActiveFilter}
          onAddToCart={addItem}
        />

        <section className={styles.storySection} id="story">
          <div className={styles.storyVisual}>
            <div className={styles.storyCircle} />
            <span>EST. 2021</span>
            <strong>M</strong>
          </div>
          <div className={styles.storyCopy}>
            <p className={styles.eyebrow}>Our point of view</p>
            <h2>
              덜 사고,
              <br />
              <em>더 오래.</em>
            </h2>
            <p>
              빠르게 바뀌는 유행보다 손에 익는 감각을 믿습니다. 쓰임이 분명하고,
              만드는 사람의 태도가 담긴 물건을 골라 소개합니다.
            </p>
            <Button
              className={styles.textButton}
              component="a"
              href="#top"
              disableRipple
            >
              Morrow 이야기 읽기 <ArrowForward />
            </Button>
          </div>
        </section>

      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <a className={styles.logo} href="#top">
            MORROW<span>.</span>
          </a>
          <p>Make room for good things.</p>
        </div>

        <div className={styles.footerLinks}>
          <div>
            <strong>Explore</strong>
            <a href="#new-arrivals">New in</a>
            <a href="#categories">Shop all</a>
            <a href="#story">Our story</a>
          </div>
          <div>
            <strong>Help</strong>
            <a href="/shipping-returns">배송 & 교환</a>
            <a href="/faq">자주 묻는 질문</a>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>© 2025 MORROW STUDIO</span>
          <span>Seoul, Korea</span>
          <a href="#top">
            Back to top <ArrowUpward />
          </a>
        </div>
      </footer>
    </div>
  );
}
