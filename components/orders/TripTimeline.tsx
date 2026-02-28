'use client';

import { CheckCircle2, Circle, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TripStatus, TripLog } from '@/types';
import { formatDateTime, cn } from '@/lib/utils';

const TRIP_STEPS: { status: TripStatus; label: string }[] = [
  { status: 'DRIVER_ASSIGNED',    label: 'Driver Assigned' },
  { status: 'DEPART_GARAGE',      label: 'Depart Garage' },
  { status: 'ARRIVE_AT_CUSTOMER', label: 'Arrive at Customer' },
  { status: 'ON_TRIP',            label: 'On Trip' },
  { status: 'DROP_CUSTOMER',      label: 'Drop Customer' },
  { status: 'RETURN_GARAGE',      label: 'Return to Garage' },
  { status: 'ARRIVE_GARAGE',      label: 'Arrive Garage' },
  { status: 'COMPLETED',          label: 'Completed' },
];

// Mirrors backend TRIP_TRANSITIONS exactly
const NEXT_STATUS: Partial<Record<TripStatus, TripStatus>> = {
  DRIVER_ASSIGNED:    'DEPART_GARAGE',
  DEPART_GARAGE:      'ARRIVE_AT_CUSTOMER',
  ARRIVE_AT_CUSTOMER: 'ON_TRIP',
  ON_TRIP:            'DROP_CUSTOMER',
  DROP_CUSTOMER:      'RETURN_GARAGE',
  RETURN_GARAGE:      'ARRIVE_GARAGE',
  ARRIVE_GARAGE:      'COMPLETED',
};

const STATUS_ORDER = TRIP_STEPS.map((s) => s.status);

interface Props {
  currentStatus: TripStatus;
  logs: TripLog[];
  tripId: string;
  onAdvance: (nextStatus: TripStatus) => Promise<void>;
  isAdvancing: boolean;
}

export default function TripTimeline({
  currentStatus,
  logs,
  onAdvance,
  isAdvancing,
}: Props) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const nextStatus = NEXT_STATUS[currentStatus];

  function getLogForStatus(status: TripStatus): TripLog | undefined {
    return logs.find((l) => l.status === status);
  }

  return (
    <div className="space-y-0">
      {TRIP_STEPS.map((step, index) => {
        const log = getLogForStatus(step.status);
        const isDone = index < currentIndex;
        const isCurrent = step.status === currentStatus;

        return (
          <div key={step.status} className="flex gap-4">
            {/* Icon + vertical connector */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full shrink-0 z-10',
                  isDone
                    ? 'bg-emerald-100 text-emerald-600'
                    : isCurrent
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-300'
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              {index < TRIP_STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 h-8',
                    isDone ? 'bg-emerald-200' : 'bg-gray-100'
                  )}
                />
              )}
            </div>

            {/* Label + timestamp */}
            <div className="pb-4 min-w-0 flex-1">
              <div className="flex items-center justify-between h-8 gap-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    isDone
                      ? 'text-gray-600'
                      : isCurrent
                      ? 'text-gray-900'
                      : 'text-gray-300'
                  )}
                >
                  {step.label}
                  {isCurrent && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                      Current
                    </span>
                  )}
                </span>
                {log && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatDateTime(log.created_at)} · {log.actor}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Advance to next status — shown whenever there is a valid next step */}
      {nextStatus && (
        <div className="pt-3 pl-12">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAdvance(nextStatus)}
            disabled={isAdvancing}
            className="gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {isAdvancing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Advance to:{' '}
            <span className="font-semibold">
              {TRIP_STEPS.find((s) => s.status === nextStatus)?.label}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
