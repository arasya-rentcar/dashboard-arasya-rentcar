"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Car,
  FileText,
  HelpCircle,
  LogOut,
  UserRound,
  Handshake,
  CalendarDays,
  Wallet,
  Inbox,
  Bell,
  CreditCard,
  Tags,
  ChevronDown,
  ShoppingBag,
  Route,
  Landmark,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { clearAuth, getUser } from "@/lib/auth";
import { confirmLeave } from "@/lib/leaveGuard";
import { Button } from "@/components/ui/button";
import { User } from "@/types";

type NavKey =
  | "dashboard"
  | "notifications"
  | "leads"
  | "orders"
  | "customers"
  | "priceList"
  | "schedule"
  | "drivers"
  | "cars"
  | "etollCards"
  | "external"
  | "invoices"
  | "payables"
  | "revenue"
  | "guide";

type NavItem = { href: string; key: NavKey; icon: LucideIcon };
type NavGroup = { key: string; icon: LucideIcon; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    key: "groupOverview",
    icon: LayoutDashboard,
    items: [
      { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
      { href: "/dashboard/notifications", key: "notifications", icon: Bell },
    ],
  },
  {
    key: "groupSales",
    icon: ShoppingBag,
    items: [
      { href: "/dashboard/leads", key: "leads", icon: Inbox },
      { href: "/dashboard/orders", key: "orders", icon: ClipboardList },
      { href: "/dashboard/customers", key: "customers", icon: UserRound },
      { href: "/dashboard/price-list", key: "priceList", icon: Tags },
    ],
  },
  {
    key: "groupOperations",
    icon: Route,
    items: [
      { href: "/dashboard/schedule", key: "schedule", icon: CalendarDays },
      { href: "/dashboard/drivers", key: "drivers", icon: Users },
      { href: "/dashboard/cars", key: "cars", icon: Car },
      { href: "/dashboard/etoll-cards", key: "etollCards", icon: CreditCard },
      { href: "/dashboard/external", key: "external", icon: Handshake },
    ],
  },
  {
    key: "groupFinance",
    icon: Landmark,
    items: [
      { href: "/dashboard/invoices", key: "invoices", icon: FileText },
      { href: "/dashboard/payables", key: "payables", icon: Wallet },
      { href: "/dashboard/revenue", key: "revenue", icon: TrendingUp },
    ],
  },
  {
    key: "groupHelp",
    icon: HelpCircle,
    items: [{ href: "/dashboard/guide", key: "guide", icon: HelpCircle }],
  },
];

// Groups the admin closed; remembered per browser.
const COLLAPSED_STORAGE_KEY = "arasya.nav.collapsed";

function isActiveHref(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({
  className,
  onNavigate,
}: {
  className?: string;
  /** Called when a menu item is clicked (the mobile drawer closes itself). */
  onNavigate?: () => void;
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  // Unhandled website leads, shown as a badge on "Lead Website".
  const { data: newLeads } = useLeads({ status: "NEW", limit: 1 }, { refetchInterval: 60_000 });
  const newLeadCount = newLeads?.meta.counts.NEW ?? 0;
  // Unread driver notifications (same 15 s poll as the bell in the top bar).
  const { data: unreadData } = useUnreadCount();
  const unreadNotifications = unreadData?.unread_count ?? 0;
  // Read localStorage only on client to avoid SSR hydration mismatch
  const [user, setUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  useEffect(() => {
    setUser(getUser());
    try {
      const stored = JSON.parse(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? "[]");
      if (Array.isArray(stored)) setCollapsed(stored.filter((k) => typeof k === "string"));
    } catch {
      /* ignore storage errors */
    }
  }, []);

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }

  function badgeFor(key: NavKey) {
    if (key === "notifications" && unreadNotifications > 0) {
      return { count: unreadNotifications > 99 ? "99+" : String(unreadNotifications), tone: "bg-red-600" };
    }
    if (key === "leads" && newLeadCount > 0) {
      return { count: String(newLeadCount), tone: "bg-blue-600" };
    }
    return null;
  }

  function handleLogout() {
    // A page with unsaved edits (price list) asks first.
    if (!confirmLeave()) return;
    clearAuth();
    router.push("/login");
  }

  return (
    <aside className={cn("flex flex-col h-full w-64 bg-white border-r border-gray-100", className)}>
      {/* Logo */}
      <div className="shrink-0 px-6 py-5 border-b border-gray-100">
        <span className="text-lg font-semibold tracking-tight text-gray-900">
          Arasya RentCar
        </span>
        <p className="text-xs text-gray-400 mt-0.5">Admin Dashboard</p>
        {/* Brand line stays untranslated (proper noun). */}
      </div>

      {/* Navigation: scrolls on its own so the logout button stays reachable on
          short screens. */}
      <nav aria-label={t("menu")} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-1">
        {NAV_GROUPS.map((group) => {
          const hasActive = group.items.some((item) => isActiveHref(pathname, item.href));
          // The group holding the current page always stays open.
          const open = hasActive || !collapsed.includes(group.key);
          const listId = `nav-${group.key}`;
          const GroupIcon = group.icon;
          const hiddenBadges = open
            ? []
            : group.items.map((item) => badgeFor(item.key)).filter((b) => b !== null);
          return (
            <div key={group.key}>
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                disabled={hasActive}
                aria-expanded={open}
                aria-controls={listId}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <GroupIcon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{t(group.key)}</span>
                {hiddenBadges.map((b, i) => (
                  <span
                    key={i}
                    className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white", b.tone)}
                  >
                    {b.count}
                  </span>
                ))}
                {!hasActive && (
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-gray-400 transition-transform", !open && "-rotate-90")}
                    aria-hidden="true"
                  />
                )}
              </button>
              {open && (
                <ul id={listId} className="mt-0.5 mb-1.5 ml-5 space-y-0.5 border-l border-gray-100 pl-2">
                  {group.items.map(({ href, key, icon: Icon }) => {
                    const isActive = isActiveHref(pathname, href);
                    const badge = badgeFor(key);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={onNavigate}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-gray-900 text-white"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 truncate">{t(key)}</span>
                          {badge && (
                            <span
                              className={cn(
                                "ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                                isActive ? "bg-white text-gray-900" : cn(badge.tone, "text-white"),
                              )}
                            >
                              {badge.count}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="shrink-0 px-3 pb-4 border-t border-gray-100 pt-4">
        {user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-gray-400">{tc("loggedInAs")}</p>
            <p className="text-sm font-medium text-gray-700 truncate" title={user.email}>
              {user.email}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-gray-600 hover:text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </Button>
      </div>
    </aside>
  );
}
