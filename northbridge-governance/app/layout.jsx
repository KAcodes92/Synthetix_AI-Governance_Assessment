export const metadata = {
  title: "Northbridge (Portfolio Demo)",
  description: "AI Governance Readiness Assessment — portfolio demonstration by Kartikeya Awasthi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
