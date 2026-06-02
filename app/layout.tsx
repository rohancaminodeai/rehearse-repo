import "./globals.css";

export const metadata = { title: "InBody Board" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ minHeight: "100vh", background: "var(--bg)" }}>
        {children}
      </body>
    </html>
  );
}
