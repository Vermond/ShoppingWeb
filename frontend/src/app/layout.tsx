import type { Metadata } from "next";
import { ThemeRegistry } from "../components/ThemeRegistry";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morrow — 좋은 물건은 시간을 닮아요",
  description: "매일 곁에 두고 오래 쓰는 것들. Morrow가 고른 조용한 오브젝트 컬렉션.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
