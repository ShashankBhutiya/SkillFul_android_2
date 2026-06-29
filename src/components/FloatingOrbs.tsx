import { motion } from "framer-motion";

const FloatingOrbs = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Soft violet orb — top left */}
      <div
        className="floating-orb floating-orb-1"
        style={{
          width: 500,
          height: 500,
          top: "-8%",
          left: "-6%",
          background: "radial-gradient(circle, hsl(255 70% 60% / 0.25), transparent 70%)",
        }}
      />
      {/* Warm accent orb — bottom right */}
      <div
        className="floating-orb floating-orb-2"
        style={{
          width: 420,
          height: 420,
          bottom: "-5%",
          right: "-4%",
          background: "radial-gradient(circle, hsl(280 60% 55% / 0.2), transparent 70%)",
        }}
      />
      {/* Subtle teal orb — center */}
      <div
        className="floating-orb floating-orb-3"
        style={{
          width: 350,
          height: 350,
          top: "40%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(circle, hsl(180 50% 55% / 0.12), transparent 70%)",
        }}
      />
    </div>
  );
};

export default FloatingOrbs;
