"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOut } from "@/components/sign-out";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  TrendingUp,
  Users,
  Wallet,
  Tags,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Landmark,
  ChevronRight,
} from "lucide-react";
const links = [
  ["/", "Overview", LayoutDashboard],
  ["/transactions", "Transactions", ArrowLeftRight],
  ["/monthly-recap", "Monthly Recap", ChartNoAxesCombined],
  ["/investments", "Investments", TrendingUp],
  ["/splits", "Splits & Friends", Users],
  ["/accounts", "Accounts", Wallet],
  ["/categories", "Categories", Tags],
  ["/settings", "Settings", Settings],
] as const;
export function Shell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
}) {
  const path = usePathname(),
    [collapsed, setCollapsed] = useState(false);
  return (
    <div className={collapsed ? "app collapsed" : "app"}>
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <Landmark size={20} />
          </span>
          <span className="sidebar-label">
            Ledgerly<span className="brand-sub">PERSONAL FINANCE</span>
          </span>
        </Link>
        <div className="nav-caption sidebar-label">WORKSPACE</div>
        <nav>
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "nav-link active" : "nav-link"}
              title={label}
            >
              <Icon size={18} />
              <span className="sidebar-label">{label}</span>
              {path === href && (
                <ChevronRight className="nav-chevron sidebar-label" size={14} />
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-label sidebar-label">
            <span className="status-dot" /> Private workspace
            <small>Your finances. Your control.</small>
          </div>
          <button
            className="collapse-button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
            <span className="sidebar-label">Collapse sidebar</span>
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <span>
            Personal workspace <ChevronRight size={13} />{" "}
            <strong>
              {links.find((l) => l[0] === path)?.[1] || "Ledgerly"}
            </strong>
          </span>
          <div className="session-controls">
            <span className="user-email" title={user.email}>
              {user.email}
            </span>
            <SignOut />
          </div>
        </header>
        <main>{children}</main>
        <footer className="page-footer">
          <span>Ledgerly · A clearer view of your money.</span>
          <span>INR · India</span>
        </footer>
      </div>
      <nav className="mobile-nav">
        {links.slice(0, 6).map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            className={path === href ? "active" : ""}
          >
            <Icon size={20} />
            <span>
              {label === "Monthly Recap"
                ? "Recap"
                : label === "Splits & Friends"
                  ? "Splits"
                  : label}
            </span>
          </Link>
        ))}
        <Link href="/settings" aria-label="Settings">
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}
