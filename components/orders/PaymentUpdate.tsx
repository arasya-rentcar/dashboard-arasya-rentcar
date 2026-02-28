'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaymentStatus } from '@/types';

interface Props {
  currentStatus: PaymentStatus;
  onUpdate: (status: PaymentStatus) => Promise<void>;
  disabled?: boolean;
}

const OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'DP_PAID', label: 'DP Paid' },
  { value: 'PAID', label: 'Paid' },
];

export default function PaymentUpdate({ currentStatus, onUpdate, disabled }: Props) {
  const [selected, setSelected] = useState<PaymentStatus>(currentStatus);
  const [isLoading, setIsLoading] = useState(false);

  async function handleUpdate() {
    if (selected === currentStatus) return;
    setIsLoading(true);
    try {
      await onUpdate(selected);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Select
        value={selected}
        onValueChange={(v) => setSelected(v as PaymentStatus)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size="sm"
        variant="outline"
        onClick={handleUpdate}
        disabled={selected === currentStatus || disabled || isLoading}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Update
      </Button>
    </div>
  );
}
