// tailwind.config.ts

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        primary: {
          DEFAULT: "var(--primary)",
          deep: "var(--primary-deep)",
          soft: "var(--primary-soft)",
          mid: "var(--primary-mid)",
          foreground: "var(--primary-foreground)",
        },
        background: {
          DEFAULT: "var(--background)",
          blush: "var(--background-blush)",
        },
        foreground: "var(--foreground)",
        text: {
          main: "var(--text-main)",
          sub: "var(--text-sub)",
          muted: "var(--text-muted)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: "var(--destructive)",
        ring: "var(--ring)",
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        pill: "var(--radius-pill)",
        lg: "var(--radius-lg)",
        sm: "calc(var(--radius) - 4px)",
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.03em",
        tight: "-0.02em",
        snug: "-0.01em",
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)",
        "gradient-brand-soft":
          "linear-gradient(135deg, var(--primary-soft) 0%, #f5d0e8 100%)",
      },
      boxShadow: {
        "primary-sm": "0 4px 24px rgba(245, 100, 169, 0.25), 0 1px 4px rgba(245, 100, 169, 0.15)",
        "primary-md": "0 8px 32px rgba(245, 100, 169, 0.30), 0 2px 8px rgba(245, 100, 169, 0.18)",
        "card-hover": "0 12px 40px rgba(245, 100, 169, 0.10), 0 2px 8px rgba(0, 0, 0, 0.05)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 9s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-18px)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
