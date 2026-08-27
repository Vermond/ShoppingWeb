"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCatalog,
  type CatalogData,
} from "../../repositories/catalog.repository";

type CatalogContextValue = CatalogData & {
  isLoading: boolean;
  errorMessage: string | null;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);
const emptyCatalog: CatalogData = {
  products: [],
  categories: [],
};

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<CatalogData>(emptyCatalog);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      try {
        const result = await fetchCatalog();

        if (!cancelled) {
          setCatalog(result);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setCatalog(emptyCatalog);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "상품 데이터를 불러오지 못했어요.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    const loadId = window.setTimeout(loadCatalog, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(loadId);
    };
  }, []);

  const value = useMemo(
    () => ({ ...catalog, isLoading, errorMessage }),
    [catalog, errorMessage, isLoading],
  );

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const context = useContext(CatalogContext);

  if (!context) {
    throw new Error("useCatalog must be used within CatalogProvider");
  }

  return context;
}
