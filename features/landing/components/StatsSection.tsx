// features/landing/components/StatsSection.tsx

"use client";

import { SPRING } from "@/lib/framer/framer-utils";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 4, label: "User roles", suffix: "" },
  { value: 7, label: "Core modules", suffix: "" },
  { value: 8, label: "Auto-generated checklists", suffix: "" },
  { value: 5, label: "Coverage areas", suffix: "" },
];

function AnimatedNumber({
  value,
  suffix,
  trigger,
}: {
  value: number;
  suffix: string;
  trigger: boolean;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const duration = 1400;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * value);
      setDisplay(start);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [trigger, value]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

const sectionVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING,
  },
};

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="py-20 px-6 gradient-bg text-center overflow-hidden"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tighter text-white mb-3">
            Built for real-world operations
          </h2>
          <p className="text-[1rem] font-light text-white/75 max-w-[420px] mx-auto leading-[1.7] tracking-snug mb-14">
            Designed specifically for how Fab Memories Events works — across
            locations, event types, and team roles.
          </p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={itemVariants}>
              <p className="text-[2.8rem] font-bold tracking-tightest text-white leading-none mb-2">
                <AnimatedNumber
                  value={stat.value}
                  suffix={stat.suffix}
                  trigger={isInView}
                />
              </p>
              <p className="text-[12px] font-normal text-white/65 tracking-widest uppercase">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
