// features/landing/components/CtaSection.tsx

"use client";

import { motion } from "framer-motion";
import { ArrowRight, CalendarHeart } from "lucide-react";
import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="relative py-28 px-6 text-center overflow-hidden bg-white">
      {/* Background orb */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(245,100,169,0.09) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-2xl mx-auto"
      >
        {/* Icon */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-soft mb-8"
        >
          <CalendarHeart size={26} className="text-primary" aria-hidden="true" />
        </motion.div>

        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-primary mb-4">
          Get started
        </p>

        <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tighter text-text-main mb-4">
          Your most important day deserves the best platform.
        </h2>

        <p className="text-[1rem] font-light text-text-sub max-w-[440px] mx-auto leading-[1.7] tracking-snug mb-10">
          Join Fab Memories Events and experience a seamless, fully digital
          event planning journey from booking to your big day.
        </p>

        <div className="flex items-center gap-3 justify-center flex-wrap">
          <Link href="/sign-up">
            <motion.button
              whileHover={{
                scale: 1.04,
                boxShadow: "0 8px 32px rgba(245,100,169,0.38)",
              }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 text-[15px] font-medium text-white gradient-bg rounded-pill px-7 py-[14px] border-0 cursor-pointer shadow-primary-sm"
            >
              Book your event now
              <ArrowRight size={16} aria-hidden="true" />
            </motion.button>
          </Link>

          <Link href="/sign-in">
            <motion.button
              whileHover={{
                scale: 1.03,
                backgroundColor: "rgba(252,232,243,0.8)",
              }}
              whileTap={{ scale: 0.97 }}
              className="text-[15px] font-normal text-primary bg-transparent border border-border-strong rounded-pill px-7 py-[14px] cursor-pointer transition-colors"
            >
              Sign in
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
