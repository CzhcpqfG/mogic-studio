import { Provider } from "@/components/provider";
import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: {
    default: "Mogic-Studio 文档",
    template: "%s | Mogic-Studio 文档",
  },
  description:
    "Mogic-Studio - AI创意工作台官方文档，提供图片、视频、音频、短剧等多种AI生成能力的完整指南。",
  keywords: [
    "Mogic-Studio",
    "AI创意",
    "图片生成",
    "视频生成",
    "短剧制作",
    "AI工作台",
    "文档",
  ],
  authors: [{ name: "MOGIC Team" }],
  creator: "MOGIC Team",
  publisher: "MOGIC",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://docs.mogic.pro",
  ),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    title: "Mogic-Studio 文档",
    description: "Mogic-Studio - AI创意工作台官方文档",
    siteName: "Mogic-Studio 文档",
    images: ["/logo.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mogic-Studio 文档",
    description: "Mogic-Studio - AI创意工作台官方文档",
    images: ["/logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
