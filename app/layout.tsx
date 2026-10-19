import type { Metadata } from "next";
import "./globals.css";
import "./crabs.css";
import "./crabs-gold.css";

export const metadata: Metadata = {
  title: "Crabs CRM · Tư vấn có duyệt",
  description: "Hộp thư OTA, phản hồi có duyệt và phối hợp dịch vụ khách sạn Luxe Paradise.",
  icons: {
    icon: "/crabs-gold-logo.png",
    shortcut: "/crabs-gold-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
