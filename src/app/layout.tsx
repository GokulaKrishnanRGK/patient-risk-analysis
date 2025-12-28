import "./globals.css";
import React from "react";

export const metadata = {
  title: "Patient Risk Assessment",
  description: "Patient risk analysis dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="en">
      <body>{children}</body>
      </html>
  );
}
