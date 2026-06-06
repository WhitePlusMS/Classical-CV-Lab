import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CV Teaching - 计算机视觉教学",
  description: "交互式计算机视觉算法教学平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
