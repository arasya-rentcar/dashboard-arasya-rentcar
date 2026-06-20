"use client";

import { useState } from "react";
import { ChevronDown, Edit, MapPin, Hash, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import CarPhotoCell from "@/components/cars/CarPhotoCell";
import CarRevenuePanel from "@/components/revenue/CarRevenuePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Car, CarStatus } from "@/types";

const CAR_STATUS_STYLES: Record<CarStatus, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  IN_USE: "bg-amber-50 text-amber-700 border-amber-200",
  MAINTENANCE: "bg-red-50 text-red-700 border-red-200",
};

// Sprint 5 (#Q7): car detail card. Surfaces the data that matters at a glance —
// photo, unit code, model, plate, type, status, base location.
export default function CarCard({
  car,
  onEdit,
}: {
  car: Car;
  onEdit: (car: Car) => void;
}) {
  const t = useTranslations("cars");
  const tc = useTranslations("common");
  const tt = useTranslations("terms");
  const ts = useTranslations("carStatus");
  const [showRevenue, setShowRevenue] = useState(false);
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md">
      {/* Photo (click to upload/replace) */}
      <div className="relative aspect-[4/3] w-full bg-gray-50">
        <CarPhotoCell car={car} variant="cover" />
        <div className="absolute left-2 top-2 flex gap-1.5">
          <Badge
            variant="outline"
            className={`text-[11px] shadow-sm ${CAR_STATUS_STYLES[car.status]}`}
          >
            {ts(car.status)}
          </Badge>
        </div>
        <div className="absolute right-2 top-2">
          <Badge
            variant="outline"
            className={
              car.type === "INTERNAL"
                ? "text-[11px] shadow-sm bg-blue-50 text-blue-700 border-blue-200"
                : "text-[11px] shadow-sm bg-purple-50 text-purple-700 border-purple-200"
            }
          >
            {car.type === "INTERNAL" ? tt("internal") : tt("external")}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">
              {car.model}
            </p>
            <p className="mt-0.5 font-mono text-xs text-gray-500">
              {car.plate_number}
            </p>
          </div>
          {car.unit_code && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs font-semibold text-gray-700">
              <Hash className="h-3 w-3" />
              {car.unit_code}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{car.origin_location || t("baseNotSet")}</span>
        </div>

        {showRevenue && (
          <div className="pt-1">
            <CarRevenuePanel carId={car.id} showToggle={false} />
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(car)}
          >
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            {tc("edit")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={showRevenue ? "px-2 bg-gray-50" : "px-2"}
            title={t("revenueOfUnit")}
            onClick={() => setShowRevenue((v) => !v)}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <ChevronDown
              className={`ml-0.5 h-3 w-3 transition-transform ${showRevenue ? "rotate-180" : ""}`}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
