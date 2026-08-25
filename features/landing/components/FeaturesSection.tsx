// features/landing/components/FeaturesSection.tsx

"use client";

import { SPRING } from "@/lib/framer/framer-utils";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CreditCard,
  FileText,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";

const features = [
  {
    icon: CalendarDays,
    title: "Smart booking",
    description:
      "Submit event details, choose packages, and receive confirmation through a structured digital flow. No more Messenger threads.",
  },
  {
    icon: CreditCard,
    title: "Payment tracking",
    description:
      "Upload proof of payment, track verification status in real time, and receive structured receipts for every transaction.",
  },
  {
    icon: Store,
    title: "Vendor coordination",
    description:
      "Coordinators assign vendors digitally. Vendors confirm availability and submit quotations — no phone tag required.",
  },
  {
    icon: Users,
    title: "Staff scheduling",
    description:
      "Automated conflict detection ensures coordinators are never double-booked. Guest count–based ratios applied automatically.",
  },
  {
    icon: FileText,
    title: "Document generation",
    description:
      "Contracts, invoices, receipts, and event checklists are generated automatically upon booking confirmation.",
  },
  {
    icon: ShieldCheck,
    title: "Audit trail",
    description:
      "Every action — who did what, when — is logged with a tamper-evident record. Full operational transparency for the business owner.",
  },
];

const sectionVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING,
  },
};

const headingVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING,
  },
};

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <motion.div
          variants={headingVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-14"
        >
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-primary mb-3">
            Platform features
          </p>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tighter text-text-main max-w-[520px] mb-4">
            Everything you need in one place
          </h2>
          <p className="text-[1rem] font-light text-text-sub max-w-[460px] leading-[1.7] tracking-snug">
            From the first inquiry to the final receipt — every step is tracked,
            verified, and beautifully organized.
          </p>
        </motion.div>

        {/* Cards grid */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{
                  y: -4,
                  boxShadow:
                    "0 12px 40px rgba(245,100,169,0.10), 0 2px 8px rgba(0,0,0,0.05)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative bg-white border border-border rounded-lg p-7 overflow-hidden cursor-default"
              >
                {/* Subtle card gradient overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(245,100,169,0.04) 0%, transparent 60%)",
                  }}
                  aria-hidden="true"
                />

                {/* Icon */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center mb-5"
                >
                  <Icon size={19} className="text-primary" aria-hidden="true" />
                </motion.div>

                <h3 className="text-[15px] font-semibold tracking-tight text-text-main mb-2">
                  {feature.title}
                </h3>
                <p className="text-[13px] font-light text-text-sub leading-[1.65]">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
