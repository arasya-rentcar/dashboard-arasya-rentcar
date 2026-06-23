'use client';

import { Menu } from 'lucide-react';
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

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 sm:gap-4 sm:px-6">
      {/* Mobile sidebar trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          {/* Accessible name for the drawer (visually hidden) — silences the
              Radix Dialog a11y warning and helps screen readers. */}
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      <h1 className="truncate text-base font-semibold text-gray-900">{title}</h1>

      {/* Live WIB clock — hidden on very small screens to protect the title. */}
      <div className="ml-1 hidden sm:block sm:ml-3">
        <WibClock />
      </div>

      {/* Language toggle pinned to the right. */}
      <div className="ml-auto">
        <LanguageToggle />
      </div>
    </header>
  );
}
