"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSetDriverAppPassword } from "@/hooks/useDrivers";
import { getErrorMessage } from "@/lib/utils";

const MIN_LENGTH = 6;

// Driver app access: the driver logs in with their phone number + a password
// set here by an admin. The password is write-only — never shown back.
export default function DriverAppAccessCard({
  driverId,
  phone,
}: {
  driverId: string;
  phone?: string | null;
}) {
  const t = useTranslations("driverDetail");
  const tc = useTranslations("common");
  const setPassword = useSetDriverAppPassword();
  const [open, setOpen] = useState(false);
  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPasswordValue("");
    setConfirm("");
    setError(null);
  }

  async function submit() {
    if (password.length < MIN_LENGTH) {
      setError(t("appPasswordTooShort", { min: MIN_LENGTH }));
      return;
    }
    if (password !== confirm) {
      setError(t("appPasswordMismatch"));
      return;
    }
    setError(null);
    try {
      await setPassword.mutateAsync({ id: driverId, password });
      toast.success(t("appPasswordSaved"));
      reset();
      setOpen(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Card className="border border-gray-200 shadow-none">
      <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Smartphone className="h-4 w-4 text-gray-500" />
            {t("appAccessTitle")}
          </p>
          <p className="text-sm text-gray-500">{t("appAccessDesc")}</p>
          <p className="text-sm text-gray-700">
            {t("appAccessLogin")}:{" "}
            {phone ? (
              <span className="font-mono font-medium">{phone}</span>
            ) : (
              <span className="text-amber-700">{t("appAccessNoPhone")}</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={!phone}
        >
          <KeyRound className="mr-1.5 h-4 w-4" />
          {t("appPasswordSet")}
        </Button>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) reset();
          setOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("appPasswordTitle")}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <p className="text-sm text-gray-500">
              {t("appPasswordIntro", { phone: phone ?? "" })}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="driver-app-password">{t("appPasswordNew")}</Label>
              <Input
                id="driver-app-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
              />
              <p className="text-[11px] text-gray-400">
                {t("appPasswordHint", { min: MIN_LENGTH })}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driver-app-password-confirm">
                {t("appPasswordConfirm")}
              </Label>
              <Input
                id="driver-app-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={setPassword.isPending}
              >
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={setPassword.isPending || !password || !confirm}
              >
                {setPassword.isPending ? t("appPasswordSaving") : t("appPasswordSave")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
