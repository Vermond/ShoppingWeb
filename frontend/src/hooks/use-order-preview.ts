"use client";

import { useEffect, useState } from "react";
import {
  fetchOrderPreview,
  type OrderAmounts,
} from "../repositories/orders.repository";

type OrderPreviewState = {
  amounts: OrderAmounts | null;
  isLoading: boolean;
  errorMessage: string | null;
};

type PreviewRequestState = {
  key: string;
  amounts: OrderAmounts | null;
  errorMessage: string | null;
};

export function useOrderPreview(
  enabled: boolean,
  refreshKey: string,
): OrderPreviewState {
  const [requestState, setRequestState] = useState<PreviewRequestState>({
    key: "",
    amounts: null,
    errorMessage: null,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;

    const loadPreview = async () => {
      try {
        const result = await fetchOrderPreview();

        if (active) {
          setRequestState({
            key: refreshKey,
            amounts: result,
            errorMessage: null,
          });
        }
      } catch (error) {
        if (active) {
          setRequestState({
            key: refreshKey,
            amounts: null,
            errorMessage:
              error instanceof Error
                ? error.message
                : "주문 금액을 확인하지 못했어요.",
          });
        }
      }
    };

    void loadPreview();

    return () => {
      active = false;
    };
  }, [enabled, refreshKey]);

  const isCurrent = enabled && requestState.key === refreshKey;

  return {
    amounts: isCurrent ? requestState.amounts : null,
    isLoading: enabled && !isCurrent,
    errorMessage: isCurrent ? requestState.errorMessage : null,
  };
}
