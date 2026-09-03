// features/landing/components/Navbar.tsx

"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";

/*
 * FIX: "For vendors" and "About" previously pointed to `#vendors` and
 * `#about` — no section on this page has those ids, so clicking them
 * did nothing. RolesSection covers all four roles (including vendors)
 * in one section, so it's been renamed to a single, honest link.
 * "Packages" is new — links to the public /packages page.
 */
const navLinks = [
  { label: "Features",     href: "#features" },
  { label: "Who it's for", href: "#roles" },
  { label: "Packages",     href: "/packages" },
];

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 glass border-b border-border"
    >
      <div className="max-w-6xl mx-auto px-6 h-[52px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ rotate: 20, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <Sparkles
              size={17}
              className="text-primary"
              aria-hidden="true"
            />
          </motion.div>
          <span className="text-[15px] font-semibold tracking-tight gradient-text">
            Fab Memories Events
          </span>
        </Link>

        {/* Nav links */}
        <nav aria-label="Main navigation">
          <ul className="hidden md:flex items-center gap-8 list-none">
            {navLinks.map((link, i) => (
              <motion.li
                key={link.href}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.1 + i * 0.07,
                  duration: 0.4,
                  ease: "easeOut",
                }}
              >
                <Link
                  href={link.href}
                  className="text-[13px] font-normal text-text-sub hover:text-primary transition-colors duration-200"
                >
                  {link.label}
                </Link>
              </motion.li>
            ))}
          </ul>
        </nav>

        {/* CTA + sign in */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
          className="flex items-center gap-3"
        >
          {/*
            FIX: previously linked to /staff-login — a prospective CLIENT
            clicking "Book an event" was sent to the internal staff login
            page. Now correctly routes to /sign-up (new visitor) with a
            secondary link to /sign-in for returning clients.
          */}
          <Link
            href="/sign-in"
            className="hidden sm:block text-[13px] font-medium text-text-sub hover:text-primary transition-colors"
          >
            Sign in
          </Link>
          <Link href="/sign-up">
            <motion.button
              whileHover={{ scale: 1.04, opacity: 0.9 }}
              whileTap={{ scale: 0.97 }}
              className="text-[13px] font-medium text-white gradient-bg rounded-pill px-[18px] py-[7px] border-0 cursor-pointer shadow-primary-sm"
            >
              Book an event
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </motion.header>
  );
}
