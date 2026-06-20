"use client";

import { useRef } from "react";
import { Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useUploadCarPhoto } from "@/hooks/useCars";
import { getErrorMessage } from "@/lib/utils";
import type { Car } from "@/types";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

// Sprint 3: clickable car-photo thumbnail. Click to upload/replace the photo;
// shows the current photo if set, otherwise a placeholder.
export default function CarPhotoCell({ car }: { car: Car }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadCarPhoto();
  const isUploading = uploadMutation.isPending;

  function onPick(file: File | null) {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error("Foto harus JPEG, PNG, atau WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Ukuran foto maksimal 10MB.");
      return;
    }
    uploadMutation.mutate(
      { id: car.id, photo: file },
      {
        onSuccess: () => toast.success(`Foto ${car.model} berhasil diupload.`),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <button
      type="button"
      title={car.photo_url ? "Ganti foto" : "Upload foto"}
      disabled={isUploading}
      onClick={() => inputRef.current?.click()}
      className="group relative h-10 w-14 rounded border border-gray-200 overflow-hidden disabled:opacity-60"
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
          <ImageIcon className="h-4 w-4" />
        </div>
      )}

      {/* Hover/upload overlay */}
      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-opacity">
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
      </span>
      {isUploading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white">
          <Loader2 className="h-4 w-4 animate-spin" />
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
