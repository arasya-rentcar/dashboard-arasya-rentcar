'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Sidebar from './Sidebar';
import WibClock from './WibClock';
import LanguageToggle from './LanguageToggle';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="h-14 border-b border-gray-100 bg-white flex items-center px-6 gap-4 shrink-0">
      {/* Mobile sidebar trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <h1 className="text-base font-semibold text-gray-900">{title}</h1>

      {/* Live WIB clock — top-left, the single place "WIB" is shown. */}
      <div className="ml-3">
        <WibClock />
      </div>

      {/* Language toggle pinned to the right. */}
      <div className="ml-auto">
        <LanguageToggle />
      </div>
    </header>
  );
}
