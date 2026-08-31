const RETURN_TO_BASE_URL = "http://morrow.local";

function isAllowedReturnPath(pathname: string) {
  if (
    pathname === "/" ||
    pathname === "/shop" ||
    pathname === "/cart" ||
    pathname === "/wishlist" ||
    pathname === "/faq" ||
    pathname === "/shipping-returns" ||
    pathname === "/account" ||
    pathname === "/account/addresses" ||
    pathname === "/checkout" ||
    pathname === "/orders"
  ) {
    return true;
  }

  if (pathname.startsWith("/products/")) {
    const productId = pathname.slice("/products/".length);

    return productId.length > 0 && !productId.includes("/");
  }

  if (pathname.startsWith("/orders/")) {
    const orderId = pathname.slice("/orders/".length);

    return orderId.length > 0 && !orderId.includes("/");
  }

  return false;
}

export function getSafeReturnTo(
  value: string | null | undefined,
  fallback = "/",
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback;
  }

  try {
    const targetUrl = new URL(value, RETURN_TO_BASE_URL);

    if (
      targetUrl.origin !== RETURN_TO_BASE_URL ||
      !isAllowedReturnPath(targetUrl.pathname)
    ) {
      return fallback;
    }

    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch {
    return fallback;
  }
}

export function getLoginPath(returnTo?: string | null) {
  const safeReturnTo = getSafeReturnTo(returnTo);

  if (safeReturnTo === "/") {
    return "/login";
  }

  return `/login?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function getCurrentReturnTo(fallback = "/") {
  if (typeof window === "undefined") {
    return fallback;
  }

  return getSafeReturnTo(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
    fallback,
  );
}

export function getLoginReturnTo() {
  if (typeof window === "undefined") {
    return "/";
  }

  const returnTo = new URL(window.location.href).searchParams.get("returnTo");

  return getSafeReturnTo(returnTo);
}
