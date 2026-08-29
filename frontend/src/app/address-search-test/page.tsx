"use client";

import { Button } from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import {
  AddressSearchDialog,
} from "../../components/address/AddressSearchDialog";
import type { AddressSearchResult } from "../../components/address/address-search.provider";
import styles from "./page.module.css";

export default function AddressSearchTestPage() {
  const [isAddressSearchOpen, setIsAddressSearchOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] =
    useState<AddressSearchResult | null>(null);

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <Link className={styles.backLink} href="/">
          Morrow 홈
        </Link>

        <section className={styles.intro} aria-labelledby="address-search-test-title">
          <p className={styles.eyebrow}>Development Test</p>
          <h1 id="address-search-test-title">주소 검색 테스트</h1>
          <p>
            로그인 없이 주소 검색을 실행해 카카오 주소 검색 영역의 동작을
            확인합니다.
          </p>
        </section>

        <section className={styles.testPanel} aria-label="주소 검색 테스트 영역">
          <div>
            <p className={styles.panelLabel}>Address Search</p>
            <h2>주소 검색을 열어보세요.</h2>
            <p className={styles.panelDescription}>
              검색 결과를 선택하면 아래에 전달된 값이 표시됩니다.
            </p>
          </div>

          <Button
            className={styles.searchButton}
            type="button"
            variant="contained"
            onClick={() => setIsAddressSearchOpen(true)}
          >
            주소 검색 열기
          </Button>
        </section>

        {selectedAddress && (
          <section className={styles.result} aria-live="polite">
            <p className={styles.panelLabel}>Selected Address</p>
            <dl>
              <div>
                <dt>우편번호</dt>
                <dd>{selectedAddress.postalCode}</dd>
              </div>
              <div>
                <dt>주소</dt>
                <dd>{selectedAddress.addressLine1}</dd>
              </div>
              <div>
                <dt>주소 유형</dt>
                <dd>{selectedAddress.addressType}</dd>
              </div>
            </dl>
          </section>
        )}
      </div>

      <AddressSearchDialog
        open={isAddressSearchOpen}
        onClose={() => setIsAddressSearchOpen(false)}
        onComplete={setSelectedAddress}
      />
    </main>
  );
}
