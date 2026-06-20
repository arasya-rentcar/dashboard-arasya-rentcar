"use client";

import { useState } from "react";
import { Check, Search, UserPlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCustomers } from "@/hooks/useCustomers";
import type { Customer } from "@/types";

// Sprint 5 #15: pick an existing master customer for the primary PIC, or create
// a brand-new one inline. When a master is selected its name/phone are LOCKED to
// the master record (the backend links the order to that customer_id).
export default function CustomerPicker({
  selected,
  onSelect,
  onClear,
}: {
  selected: Customer | null;
  onSelect: (c: Customer) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useCustomers({
    search: search.trim() || undefined,
    page_size: 8,
    sort: "total_orders",
    order: "desc",
  });
  const results = data?.data ?? [];

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <p className="truncate text-sm font-medium text-gray-900">
              {selected.name}
            </p>
          </div>
          <p className="ml-6 truncate text-xs text-gray-500">
            {selected.phone || "No phone"} · {selected.total_orders} order
            {selected.total_orders === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="ml-3 flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-white hover:text-gray-900"
        >
          <X className="h-3.5 w-3.5" /> Ganti
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Cari customer lama (nama / no. HP)…"
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {isLoading ? (
            <p className="px-3 py-3 text-xs text-gray-400">Mencari…</p>
          ) : results.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-500">
              <UserPlus className="h-4 w-4" />
              Tidak ada yang cocok. Isi PIC baru di bawah — otomatis dibuat.
            </div>
          ) : (
            <ul className="max-h-56 overflow-y-auto py-1">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(c);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {c.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {c.phone || "No phone"}
                      </p>
                    </div>
                    <span className="ml-2 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                      {c.total_orders}x
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
