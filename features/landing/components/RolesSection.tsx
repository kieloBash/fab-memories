// features/landing/components/RolesSection.tsx

"use client";

import { SPRING } from "@/lib/framer/framer-utils";
import { motion } from "framer-motion";
import {
  ClipboardList,
  LayoutDashboard,
  Truck,
  UserCheck,
} from "lucide-react";

const roles = [
  {
    tag: "Admin",
    icon: LayoutDashboard,
    title: "Business owner",
    description:
      "Full visibility across all bookings, payments, audit logs, and operational reports. Real-time decision support at your fingertips.",
  },
  {
    tag: "Coordinator",
    icon: ClipboardList,
    title: "Event coordinator",
    description:
      "Manage assigned events, verify payments, coordinate vendors, and monitor scheduling conflicts — from one dashboard.",
  },
  {
    tag: "Vendor",
    icon: Truck,
    title: "Service vendor",
    description:
      "Receive assignments, confirm availability, and submit quotations digitally. No phone calls. No missed requests.",
  },
  {
    tag: "Client",
    icon: UserCheck,
    title: "Event client",
    description:
      "Book your event, upload payment proof, track status in real time, and download all your documents — all in one place.",
  },
];

const sectionVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 36 },
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

export default function RolesSection() {
  return (
    <section
      id="clients"
      className="py-24 px-6"
      style={{ backgroundColor: "var(--background-blush)" }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          variants={headingVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-14"
        >
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-primary mb-3">
            Role-based access
          </p>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tighter text-text-main max-w-[480px] mb-4">
            The right tools for every role
          </h2>
          <p className="text-[1rem] font-light text-text-sub max-w-[440px] leading-[1.7] tracking-snug">
            Each user type sees only what's relevant — nothing more, nothing
            less.
          </p>
        </motion.div>

        {/* Cards grid */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={role.tag}
                variants={cardVariants}
                whileHover={{
                  y: -4,
                  boxShadow:
                    "0 12px 40px rgba(245,100,169,0.08), 0 2px 8px rgba(0,0,0,0.04)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="bg-white border border-border rounded-lg p-6 flex flex-col gap-3 cursor-default"
              >
                {/* Tag + Icon row */}
                <div className="flex items-center justify-between">
                  <span className="inline-block text-[11px] font-semibold tracking-[0.06em] uppercase text-primary bg-primary-soft px-3 py-1 rounded-pill">
                    {role.tag}
                  </span>
                  <motion.div
                    whileHover={{ scale: 1.12, rotate: -6 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <Icon
                      size={18}
                      className="text-primary-mid"
                      aria-hidden="true"
                    />
                  </motion.div>
                </div>

                <h4 className="text-[15px] font-semibold tracking-tight text-text-main">
                  {role.title}
                </h4>
                <p className="text-[12px] font-light text-text-sub leading-[1.6]">
                  {role.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
