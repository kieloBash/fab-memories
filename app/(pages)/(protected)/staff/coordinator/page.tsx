// app/(pages)/(protected)/(staff)/staff/coordinator/page.tsx

import { ClipboardList } from 'lucide-react';

export default function CoordinatorDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
          <ClipboardList size={20} className="text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-tighter text-text-main">
            Dashboard
          </h1>
          <p className="text-[13px] text-text-muted">Event Coordinator view</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Assigned events', value: '—' },
          { label: 'Upcoming this week', value: '—' },
          { label: 'Pending verifications', value: '—' },
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
        Assigned events and schedule will render here.
      </p>
    </div>
  );
}
