// app/page.tsx

import Navbar from "@/features/landing/components/Navbar";
import HeroSection from "@/features/landing/components/HeroSection";
import FeaturesSection from "@/features/landing/components/FeaturesSection";
import StatsSection from "@/features/landing/components/StatsSection";
import RolesSection from "@/features/landing/components/RolesSection";
import CtaSection from "@/features/landing/components/CtaSection";
import Footer from "@/features/landing/components/Footer";

export const metadata = {
  title: "Fab Memories Events — Wedding & Debut Event Planning",
  description:
    "A unified platform for seamless event booking, real-time payment tracking, and vendor coordination.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <RolesSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
