// app/(pages)/(protected)/portal/bookings/page.tsx

"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useBookings } from "@/features/bookings";
import { BookingCard } from "@/features/bookings/components/booking-card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { CalendarHeart, Plus, Sparkles } from "lucide-react";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
  },
};

export default function ClientBookingsPage() {
  const router = useRouter();
  const { data: bookings, isLoading, isError } = useBookings();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My bookings"
        subtitle="Track your events and payment progress"
        icon={CalendarHeart}
        actions={
          <Button onClick={() => router.push("/portal/bookings/new")}>
            <Plus size={15} aria-hidden="true" />
            New booking
          </Button>
        }
      />

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-xl border border-border bg-white animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-[13px] text-red-600">
          Failed to load your bookings. Please refresh and try again.
        </div>
      )}

      {/* Bookings grid */}
      {bookings && bookings.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2"
        >
          {bookings.map((booking) => (
            <motion.div key={booking.id} variants={itemVariants}>
              <BookingCard
                booking={booking}
                onClick={() => router.push(`/portal/bookings/${booking.id}`)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty state */}
      {bookings && bookings.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center justify-center gap-5 py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center">
            <Sparkles size={28} className="text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[16px] font-semibold tracking-tight text-text-main">
              No bookings yet
            </p>
            <p className="text-[13px] text-text-muted mt-1 max-w-xs">
              Start planning your event by submitting a booking request.
            </p>
          </div>
          <Button onClick={() => router.push("/portal/bookings/new")}>
            <Plus size={15} aria-hidden="true" />
            Request a booking
          </Button>
        </motion.div>
      )}
    </div>
  );
}
