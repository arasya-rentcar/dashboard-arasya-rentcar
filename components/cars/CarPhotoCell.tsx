"use client";

import { useRef } from "react";
import { Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useUploadCarPhoto } from "@/hooks/useCars";
import { getErrorMessage } from "@/lib/utils";
import type { Car } from "@/types";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

// Sprint 3: clickable car-photo thumbnail. Click to upload/replace the photo;
// shows the current photo if set, otherwise a placeholder.
export default function CarPhotoCell({
  car,
  variant = "thumb",
}: {
  car: Car;
  variant?: "thumb" | "cover";
}) {
  const t = useTranslations("cars");
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadCarPhoto();
  const isUploading = uploadMutation.isPending;
  const isCover = variant === "cover";
  const iconSize = isCover ? "h-7 w-7" : "h-4 w-4";
  const spinSize = isCover ? "h-6 w-6" : "h-4 w-4";

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
    <button
      type="button"
      title={car.photo_url ? t("changePhoto") : t("uploadPhoto")}
      disabled={isUploading}
      onClick={() => inputRef.current?.click()}
      className={
        isCover
          ? "group absolute inset-0 h-full w-full overflow-hidden disabled:opacity-60"
          : "group relative h-10 w-14 rounded border border-gray-200 overflow-hidden disabled:opacity-60"
      }
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
          <ImageIcon className={iconSize} />
        </div>
      )}

      {/* Hover/upload overlay */}
      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-opacity">
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

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </button>
  );
}
