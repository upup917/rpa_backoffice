"use client";
import { usePathname } from 'next/navigation';
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <html lang="th">
      <body>
        <nav className="navbar">
          <div className="nav-brand">RPA Chatbot Management</div>
          <ul className="nav-menu">
            <li><a href="/" className={pathname === '/' ? 'active' : ''}>FAQ</a></li>
            <li><a href="/funds" className={pathname === '/funds' ? 'active' : ''}>Funds</a></li>
            <li><a href="/scenario" className={pathname === '/scenario' ? 'active' : ''}>Scenario</a></li>
            <li><a href="/manual" className={pathname === '/manual' ? 'active' : ''}>Manual</a></li>
            <li><a href="/terms" className={pathname === '/terms' ? 'active' : ''}>Terms</a></li>
            <li><a href="/history" className={pathname === '/history' ? 'active' : ''}>History</a></li>
          </ul>
        </nav>
        {children}
      </body>
    </html>
  );
}
