'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import Sidebar from './Sidebar';
import WibClock from './WibClock';
import LanguageToggle from './LanguageToggle';
import NotificationBell from '@/components/notifications/NotificationBell';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const t = useTranslations('nav');
  // Controlled so the drawer closes as soon as a menu item is tapped.
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 sm:gap-4 sm:px-6">
      {/* Mobile sidebar trigger */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="-ml-1 shrink-0 lg:hidden"
            aria-label={t('openMenu')}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 max-w-[85vw] gap-0 p-0" aria-describedby={undefined}>
          {/* Accessible name for the drawer (visually hidden). */}
          <SheetTitle className="sr-only">{t('menu')}</SheetTitle>
          <Sidebar className="w-full border-r-0" onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <h1 className="min-w-0 truncate text-base font-semibold text-gray-900" title={title}>
        {title}
      </h1>

      {/* Live WIB clock (time only below xl), hidden on phones to protect the title. */}
      <div className="ml-1 hidden shrink-0 sm:ml-3 sm:block">
        <WibClock />
      </div>

      {/* Notification bell + language toggle pinned to the right. */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <NotificationBell />
        <LanguageToggle />
      </div>
    </header>
  );
}
