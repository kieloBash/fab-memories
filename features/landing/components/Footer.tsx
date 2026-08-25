// features/landing/components/Footer.tsx

"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";

const footerLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Support", href: "/support" },
];

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="border-t border-border px-6 py-8"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Sparkles size={15} className="text-primary-mid" aria-hidden="true" />
          <span className="text-[14px] font-semibold tracking-tight text-text-sub">
            Fab Memories Events
          </span>
        </Link>

        {/* Links */}
        <ul className="flex items-center gap-6 list-none">
          {footerLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-[12px] text-text-muted hover:text-primary transition-colors duration-200"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Copyright */}
        <span className="text-[11px] text-text-muted">
          © {new Date().getFullYear()} Fab Memories Events. All rights reserved.
        </span>
      </div>
    </motion.footer>
  );
}
