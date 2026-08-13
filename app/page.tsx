import { MapPin, ShieldCheck, Store, Users } from "lucide-react";

const weddingPackages = [
  {
    tag: "Most Affordable",
    tagBg: "#EDEFF3",
    tagColor: "#5B606B",
    title: "Intimate Garden Wedding",
    detail: "Up to 50 guests · Tagaytay garden venues",
    price: "₱250,000",
    highlighted: false,
  },
  {
    tag: "Most Popular",
    tagBg: "#EAF0FF",
    tagColor: "#2F6BFF",
    title: "Classic Celebration",
    detail: "Up to 150 guests · Full styling & coordination",
    price: "₱450,000",
    highlighted: true,
  },
  {
    tag: "Premium",
    tagBg: "#FFF1D6",
    tagColor: "#B4780A",
    title: "Grand Tagaytay Wedding",
    detail: "Up to 300 guests · Multi-day coordination",
    price: "₱850,000",
    highlighted: false,
  },
];

const debutPackages = [
  {
    tag: "Cozy",
    tagBg: "#F6E9FF",
    tagColor: "#8A3FBE",
    title: "Sweet Celebration",
    detail: "Up to 80 guests · 18 roses & candles program",
    price: "₱120,000",
  },
  {
    tag: "Grand",
    tagBg: "#E3F7E9",
    tagColor: "#1F8A4C",
    title: "Grand Debut Affair",
    detail: "Up to 200 guests · Full program & entertainment",
    price: "₱280,000",
  },
];

const loginPortals = [
  {
    href: "/staff-login",
    icon: ShieldCheck,
    iconBg: "#EAF0FF",
    iconColor: "#2F6BFF",
    title: "Team Login",
    detail: "For admins & event coordinators.",
  },
  {
    href: "/staff-login",
    icon: Store,
    iconBg: "#FDEDE3",
    iconColor: "#D97A3E",
    title: "Vendor Login",
    detail: "Access your assigned events & quotations.",
  },
  {
    href: "/sign-in",
    icon: Users,
    iconBg: "#E3F7E9",
    iconColor: "#1F8A4C",
    title: "Client Login",
    detail: "Track your booking, payments & documents.",
  },
];

function PackageCard({ pkg }: { pkg: any }) {
  return (
    <div
      style={{
        borderRadius: 18,
        background: "#F8F9FC",
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        border: pkg.highlighted ? "1.5px solid #2F6BFF" : "1.5px solid transparent",
      }}
    >
      <span
        style={{
          alignSelf: "flex-start",
          background: pkg.tagBg,
          color: pkg.tagColor,
          fontSize: 12,
          fontWeight: 600,
          padding: "5px 12px",
          borderRadius: 999,
        }}
      >
        {pkg.tag}
      </span>
      <h3 style={{ fontSize: 19, fontWeight: 700, color: "#1A1D24", margin: 0 }}>
        {pkg.title}
      </h3>
      <p style={{ fontSize: 13, color: "#8A8F98", margin: 0 }}>{pkg.detail}</p>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#1A1D24" }}>
        {pkg.price}{" "}
        <span style={{ fontSize: 13, fontWeight: 500, color: "#8A8F98" }}>
          starting
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F4F5F9", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1160,
          margin: "0 auto",
          padding: "24px 24px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "#2F6BFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            F
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#1A1D24" }}>
            Fab Memories Events
          </span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="#weddings" style={navLinkStyle}>Weddings</a>
          <a href="#debuts" style={navLinkStyle}>Debuts</a>
          <a href="#packages" style={navLinkStyle}>Packages</a>
          <a href="#contact" style={navLinkStyle}>Contact</a>
          <a
            href="/sign-in"
            style={{
              background: "#2F6BFF",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Log In
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#EAF0FF",
            color: "#2F6BFF",
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 14px",
            borderRadius: 999,
            marginBottom: 24,
          }}
        >
          <MapPin size={14} />
          Metro Manila &amp; Tagaytay
        </div>
        <h1 style={{ fontSize: 52, lineHeight: 1.1, fontWeight: 800, color: "#1A1D24", margin: "0 0 20px" }}>
          Weddings &amp; debuts,
          <br />
          planned like memories.
        </h1>
        <p style={{ fontSize: 17, color: "#5B606B", maxWidth: 560, margin: "0 auto 36px" }}>
          Full-service event planning for couples and families across Metro Manila
          and Tagaytay — from intimate garden ceremonies to grand celebrations.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <a
            href="#packages"
            style={{
              background: "#2F6BFF",
              color: "#fff",
              padding: "14px 26px",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Book a Consultation
          </a>
          <a
            href="#packages"
            style={{
              background: "#fff",
              color: "#1A1D24",
              padding: "14px 26px",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 600,
              boxShadow: "0 1px 2px rgba(16,24,40,0.06)",
            }}
          >
            View Packages
          </a>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 24px 100px" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 12px 32px rgba(16,24,40,0.06)",
            padding: 48,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <span style={eyebrowStyle}>Wedding Packages</span>
          </div>
          <h2 style={sectionHeadingStyle}>Choose your celebration</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
              marginBottom: 56,
            }}
          >
            {weddingPackages.map((pkg) => (
              <PackageCard key={pkg.title} pkg={pkg} />
            ))}
          </div>

          <div style={{ marginBottom: 8 }}>
            <span style={eyebrowStyle}>Debut Packages</span>
          </div>
          <h2 style={sectionHeadingStyle}>Turning eighteen, in style</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
            {debutPackages.map((pkg) => (
              <PackageCard key={pkg.title} pkg={pkg} />
            ))}
          </div>
        </div>
      </section>

      {/* Login portals */}
      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: "#1A1D24", margin: "0 0 8px" }}>
            Log in as
          </h2>
          <p style={{ fontSize: 14, color: "#8A8F98", margin: 0 }}>
            Choose your portal to continue.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {loginPortals.map(({ href, icon: Icon, iconBg, iconColor, title, detail }) => (
            <a
              key={title}
              href={href}
              style={{
                background: "#fff",
                borderRadius: 20,
                boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.06)",
                padding: "32px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={22} color={iconColor} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1D24", marginBottom: 4 }}>
                  {title}
                </div>
                <p style={{ fontSize: 13, color: "#8A8F98", margin: 0 }}>{detail}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px 48px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#8A8F98" }}>
          © 2026 Fab Memories Events · Based in Tagaytay City, Cavite · hello@fabmemories.ph
        </p>
      </footer>
    </div>
  );
}

const navLinkStyle = { color: "#4A4F58", fontSize: 14, fontWeight: 500, textDecoration: "none" };
const eyebrowStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#2F6BFF",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const sectionHeadingStyle = { fontSize: 28, fontWeight: 700, color: "#1A1D24", margin: "0 0 32px" };