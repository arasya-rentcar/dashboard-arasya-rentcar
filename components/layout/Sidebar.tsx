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
  Bot,
  UserRound,
  Handshake,
  CalendarDays,
  Wallet,
  Inbox,
  Bell,
} from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { clearAuth, getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { User } from "@/types";

const NAV_ITEMS = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/dashboard/notifications", key: "notifications", icon: Bell },
  { href: "/dashboard/leads", key: "leads", icon: Inbox },
  { href: "/dashboard/orders", key: "orders", icon: ClipboardList },
  { href: "/dashboard/schedule", key: "schedule", icon: CalendarDays },
  { href: "/dashboard/customers", key: "customers", icon: UserRound },
  { href: "/dashboard/drivers", key: "drivers", icon: Users },
  { href: "/dashboard/cars", key: "cars", icon: Car },
  { href: "/dashboard/external", key: "external", icon: Handshake },
  { href: "/dashboard/invoices", key: "invoices", icon: FileText },
  { href: "/dashboard/payables", key: "payables", icon: Wallet },
  { href: "/dashboard/agent", key: "agent", icon: Bot },
  { href: "/dashboard/guide", key: "guide", icon: HelpCircle },
] as const;

export default function Sidebar() {
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
  useEffect(() => {
    setUser(getUser());
  }, []);

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <aside className="flex flex-col h-full w-64 bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <span className="text-lg font-semibold tracking-tight text-gray-900">
          Arasya RentCar
        </span>
        <p className="text-xs text-gray-400 mt-0.5">Admin Dashboard</p>
        {/* Brand line stays untranslated (proper noun). */}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(key)}
              {key === "notifications" && unreadNotifications > 0 && (
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                    isActive ? "bg-white text-gray-900" : "bg-red-600 text-white",
                  )}
                >
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
              {key === "leads" && newLeadCount > 0 && (
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                    isActive ? "bg-white text-gray-900" : "bg-blue-600 text-white",
                  )}
                >
                  {newLeadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-4 border-t border-gray-100 pt-4">
        {user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-gray-400">{tc("loggedInAs")}</p>
            <p className="text-sm font-medium text-gray-700 truncate">
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
