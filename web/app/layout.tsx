import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripCord",
  description: "그룹 여행 종합 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen font-sans">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">{children}</div>
      </body>
    </html>
  );
}
