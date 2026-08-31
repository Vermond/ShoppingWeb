"use client";

import Close from "@mui/icons-material/Close";
import { Button, IconButton, Portal } from "@mui/material";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import {
  addressSearchProvider,
  type AddressSearchResult,
} from "./address-search.provider";
import styles from "./AddressSearchDialog.module.css";

type AddressSearchDialogProps = {
  open: boolean;
  onClose: () => void;
  onComplete: (result: AddressSearchResult) => void;
};

const KAKAO_POSTCODE_SCRIPT_ID = "kakao-postcode-script";
const KAKAO_POSTCODE_SCRIPT_URL =
  "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

export function AddressSearchDialog({
  open,
  onClose,
  onComplete,
}: AddressSearchDialogProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  const onCompleteRef = useRef(onComplete);
  const [isScriptReady, setIsScriptReady] = useState(
    () =>
      typeof window !== "undefined" && Boolean(window.kakao?.Postcode),
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setErrorMessage("");
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isScriptReady || !container) {
      return;
    }

    const cleanup = addressSearchProvider.embed(container, {
      onComplete(result) {
        onCompleteRef.current(result);
        setErrorMessage("");
        onCloseRef.current();
      },
      onError(message) {
        setErrorMessage(message);
      },
    });

    return () => {
      cleanup();
    };
  }, [container, isScriptReady, open]);

  const handleScriptReady = () => {
    if (window.kakao?.Postcode) {
      setIsScriptReady(true);
      return;
    }

    setErrorMessage("주소 검색 서비스를 불러오지 못했어요.");
  };

  return (
    <>
      <Script
        id={KAKAO_POSTCODE_SCRIPT_ID}
        src={KAKAO_POSTCODE_SCRIPT_URL}
        strategy="afterInteractive"
        onLoad={handleScriptReady}
        onReady={handleScriptReady}
        onError={() =>
          setErrorMessage("주소 검색 서비스를 불러오지 못했어요.")
        }
      />

      {open && (
        <Portal>
          <div className={styles.overlay}>
            <section
              className={styles.searchPanel}
              role="dialog"
              aria-modal="true"
              aria-labelledby="address-search-dialog-title"
            >
              <header className={styles.searchHeader}>
                <h2 id="address-search-dialog-title">주소 검색</h2>
                  <IconButton
                    className={styles.closeButton}
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      onCloseRef.current();
                    }}
                    aria-label="주소 검색 닫기"
                  >
                  <Close />
                </IconButton>
              </header>
              <div className={styles.dialogContent}>
                {errorMessage ? (
                  <p className={styles.message} role="alert">
                    {errorMessage}
                  </p>
                  ) : isScriptReady ? (
                    <div
                      className={styles.searchFrame}
                      ref={setContainer}
                    />
                ) : (
                  <p className={styles.message} role="status">
                    주소 검색 서비스를 불러오는 중...
                  </p>
                )}
              </div>
              <div className={styles.searchActions}>
                <Button
                  type="button"
                  onClick={() => {
                    setErrorMessage("");
                    onCloseRef.current();
                  }}
                >
                  닫기
                </Button>
              </div>
            </section>
          </div>
        </Portal>
      )}
    </>
  );
}
