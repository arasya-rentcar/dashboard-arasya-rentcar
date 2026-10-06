"use client";

import { useRef } from "react";
import { Image as ImageIcon, Loader2, Maximize2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useFilePreview } from "@/components/preview/FilePreview";
import { useUploadCarPhoto } from "@/hooks/useCars";
import { cn, getErrorMessage } from "@/lib/utils";
import type { Car } from "@/types";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

// Sprint 3: clickable car-photo thumbnail. Click to upload/replace the photo;
// shows the current photo if set, otherwise a placeholder. When a photo exists,
// the corner button opens it in the in-page viewer (touch screens have no hover,
// so the photo itself stays the upload target).
export default function CarPhotoCell({
  car,
  variant = "thumb",
}: {
  car: Car;
  variant?: "thumb" | "cover";
}) {
  const t = useTranslations("cars");
  const { openPreview } = useFilePreview();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadCarPhoto();
  const isUploading = uploadMutation.isPending;
  const isCover = variant === "cover";
  const iconSize = isCover ? "h-7 w-7" : "h-4 w-4";
  const spinSize = isCover ? "h-6 w-6" : "h-4 w-4";
  const uploadLabel = car.photo_url ? t("changePhoto") : t("uploadPhoto");

  function onPick(file: File | null) {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error(t("photoTypeError"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("photoSizeError"));
      return;
    }
    uploadMutation.mutate(
      { id: car.id, photo: file },
      {
        onSuccess: () => toast.success(t("photoUploaded", { model: car.model })),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <div
      className={
        isCover
          ? "absolute inset-0"
          : "relative h-10 w-14 shrink-0"
      }
    >
      <button
        type="button"
        title={uploadLabel}
        aria-label={`${uploadLabel}: ${car.model}`}
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "group/upload relative h-full w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-1 disabled:opacity-60",
          !isCover && "rounded border border-gray-200",
        )}
      >
        {car.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={car.photo_url}
            alt={car.model}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-300">
            <ImageIcon className={iconSize} aria-hidden="true" />
          </div>
        )}

        {/* Hover/upload overlay (named group: the card around it is a group too,
            and hovering the view button must not show the upload hint) */}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover/upload:opacity-100 group-focus-visible/upload:opacity-100"
        >
          {isUploading ? (
            <Loader2 className={`${spinSize} animate-spin`} />
          ) : (
            <Upload className={iconSize} />
          )}
        </span>
        {isUploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white">
            <Loader2 className={`${spinSize} animate-spin`} />
          </span>
        )}
      </button>

      {car.photo_url && (
        <button
          type="button"
          onClick={() =>
            openPreview({
              url: car.photo_url as string,
              title: [car.model, car.plate_number].filter(Boolean).join(" · "),
              kind: "image",
            })
          }
          aria-label={t("viewPhoto")}
          title={t("viewPhoto")}
          className={cn(
            "absolute z-10 flex items-center justify-center rounded-full text-white shadow-sm transition-colors",
            isCover
              ? "bottom-2 right-2 h-9 w-9 bg-black/55 hover:bg-black/75"
              : "-bottom-1.5 -right-1.5 h-6 w-6 border border-white bg-gray-900/80 hover:bg-gray-900",
          )}
        >
          <Maximize2 className={isCover ? "h-4 w-4" : "h-3 w-3"} aria-hidden="true" />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}
