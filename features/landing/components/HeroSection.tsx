// features/landing/components/HeroSection.tsx

"use client";

import { SPRING } from "@/lib/framer/framer-utils";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";

const coverageAreas = [
  "Metro Manila",
  "Tagaytay",
  "Cavite",
  "Laguna",
  "Batangas",
];

const headlineWords = ["Every", "moment,"];
const headlineAccent = ["perfectly", "planned."];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const wordVariants = {
  hidden: { opacity: 0, y: 32, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: SPRING,
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    // transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden">
      {/* Ambient gradient orbs */}
      <motion.div
        animate={{ y: [0, -18, 0], x: [0, 8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[56%] w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 40% 40%, rgba(245,100,169,0.18) 0%, rgba(200,80,192,0.10) 45%, transparent 70%)",
          filter: "blur(2px)",
        }}
        aria-hidden="true"
      />
      <motion.div
        animate={{ y: [0, 14, 0], x: [0, -10, 0] }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5,
        }}
        className="absolute top-[28%] left-[62%] w-[280px] h-[280px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(200,80,192,0.10) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="inline-flex items-center gap-2 bg-primary-soft text-primary text-[12px] font-medium tracking-widest uppercase px-4 py-[5px] rounded-pill mb-8"
      >
        <span
          className="w-[6px] h-[6px] rounded-full bg-primary block"
          aria-hidden="true"
        />
        Wedding &amp; Debut Event Planning
      </motion.div>

      {/* Headline */}
      <motion.h1
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="text-[clamp(2.6rem,7vw,5.2rem)] font-bold tracking-tightest leading-[1.05] text-text-main max-w-[820px] mb-6"
      >
        {headlineWords.map((word) => (
          <motion.span
            key={word}
            variants={wordVariants}
            className="inline-block mr-[0.22em]"
          >
            {word}
          </motion.span>
        ))}
        <br />
        {headlineAccent.map((word) => (
          <motion.span
            key={word}
            variants={wordVariants}
            className="inline-block mr-[0.22em] gradient-text"
          >
            {word}
          </motion.span>
        ))}
      </motion.h1>

      {/* Subheading */}
      <motion.p
        custom={0.55}
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        className="text-[1.05rem] font-light text-text-sub max-w-[500px] leading-[1.7] tracking-snug mb-10"
      >
        A unified platform for seamless event booking, real-time payment
        tracking, and vendor coordination — built for Fab Memories Events.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        custom={0.7}
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-3 flex-wrap justify-center"
      >
        <Link href="/sign-up">
          <motion.button
            whileHover={{ scale: 1.04, boxShadow: "0 8px 32px rgba(245,100,169,0.38)" }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 text-[15px] font-medium text-white gradient-bg rounded-pill px-7 py-[14px] border-0 cursor-pointer shadow-primary-sm"
          >
            Start your booking
            <ArrowRight size={16} aria-hidden="true" />
          </motion.button>
        </Link>

        {/* FIX: this button previously had no href/onClick at all — a
            fully-styled, hover-animated dead button. Now scrolls to
            the Features section, which is what "See how it works"
            implies. */}
        <Link href="#features">
          <motion.button
            whileHover={{ scale: 1.03, backgroundColor: "rgba(252,232,243,0.8)" }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 text-[15px] font-normal text-primary bg-transparent border border-border-strong rounded-pill px-7 py-[14px] cursor-pointer transition-colors"
          >
            <Play size={14} className="fill-primary" aria-hidden="true" />
            See how it works
          </motion.button>
        </Link>
      </motion.div>

      {/* Coverage areas trust strip */}
      <motion.div
        custom={0.9}
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-4 flex-wrap justify-center mt-12"
        aria-label="Coverage areas"
      >
        {coverageAreas.map((area, i) => (
          <span key={area} className="flex items-center gap-4">
            <span className="text-[12px] text-text-muted tracking-wide">
              {area}
            </span>
            {i < coverageAreas.length - 1 && (
              <span
                className="w-[3px] h-[3px] rounded-full bg-text-muted block"
                aria-hidden="true"
              />
            )}
          </span>
        ))}
      </motion.div>
    </section>
  );
}
