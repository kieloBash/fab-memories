// app/(pages)/(protected)/(client)/portal/page.tsx

import { CalendarHeart } from 'lucide-react';

export default function ClientPortalPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
          <CalendarHeart size={20} className="text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-tighter text-text-main">
            My booking
          </h1>
          <p className="text-[13px] text-text-muted">Client portal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Booking status', value: '—' },
          { label: 'Next payment due', value: '—' },
          { label: 'Days to event', value: '—' },
          { label: 'Documents ready', value: '—' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-border rounded-lg p-5 flex flex-col gap-2"
          >
            <p className="text-[12px] font-medium text-text-muted uppercase tracking-widest">
              {stat.label}
            </p>
            <p className="text-[28px] font-bold tracking-tightest text-text-main leading-none">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[13px] text-text-muted">
        Your booking details, payment status, and documents will appear here.
      </p>
    </div>
  );
}
