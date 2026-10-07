'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';

export interface VendorExtraForm {
  pic_name: string;
  area: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
}

export const emptyVendorExtra: VendorExtraForm = {
  pic_name: '',
  area: '',
  bank_name: '',
  bank_account: '',
  bank_holder: '',
};

/** Trim the partner fields for the API (empty string -> null clears a value). */
export function vendorExtraPayload(f: VendorExtraForm) {
  return {
    pic_name: f.pic_name.trim() || null,
    area: f.area.trim() || null,
    bank_name: f.bank_name.trim() || null,
    bank_account: f.bank_account.trim() || null,
    bank_holder: f.bank_holder.trim() || null,
  };
}

// PIC, service area and bank details of a partner (rekanan); the bank block is
// what finance needs when paying vendor payables.
export default function VendorExtraFields({
  value,
  onChange,
}: {
  value: VendorExtraForm;
  onChange: (v: VendorExtraForm) => void;
}) {
  const t = useTranslations('vendorFields');
  // Unique ids so each label is tied to its input (the form is used in two dialogs).
  const uid = useId();
  const fid = (k: keyof VendorExtraForm) => `${uid}-${k}`;
  const set = (k: keyof VendorExtraForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={fid('pic_name')} className="text-xs font-medium text-gray-500">
            {t('pic')}
          </label>
          <Input
            id={fid('pic_name')}
            value={value.pic_name}
            onChange={set('pic_name')}
            placeholder={t('picPlaceholder')}
          />
        </div>
        <div>
          <label htmlFor={fid('area')} className="text-xs font-medium text-gray-500">
            {t('area')}
          </label>
          <Input
            id={fid('area')}
            value={value.area}
            onChange={set('area')}
            placeholder={t('areaPlaceholder')}
          />
        </div>
      </div>
      <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 space-y-2.5">
        <p className="text-xs font-medium text-gray-600">{t('bankTitle')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={fid('bank_name')} className="text-xs font-medium text-gray-500">
              {t('bankName')}
            </label>
            <Input
              id={fid('bank_name')}
              value={value.bank_name}
              onChange={set('bank_name')}
              placeholder="BCA / Mandiri / BRI"
            />
          </div>
          <div>
            <label htmlFor={fid('bank_account')} className="text-xs font-medium text-gray-500">
              {t('bankAccount')}
            </label>
            <Input
              id={fid('bank_account')}
              inputMode="numeric"
              value={value.bank_account}
              onChange={set('bank_account')}
              placeholder="1234567890"
            />
          </div>
        </div>
        <div>
          <label htmlFor={fid('bank_holder')} className="text-xs font-medium text-gray-500">
            {t('bankHolder')}
          </label>
          <Input
            id={fid('bank_holder')}
            value={value.bank_holder}
            onChange={set('bank_holder')}
            placeholder={t('bankHolderPlaceholder')}
          />
        </div>
      </div>
    </>
  );
}
