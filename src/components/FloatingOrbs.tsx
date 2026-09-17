type FloatingOrbsProps = {
  /** Slightly stronger ambient color — use on hub-style pages. */
  vivid?: boolean;
};

const FloatingOrbs = ({ vivid = false }: FloatingOrbsProps) => {
  const orbClass = vivid ? "floating-orb floating-orb-vivid" : "floating-orb";

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className={`${orbClass} floating-orb-1`}
        style={{
          width: 500,
          height: 500,
          top: "-8%",
          left: "-6%",
          background: "radial-gradient(circle, hsl(271 75% 55% / 0.28), transparent 72%)",
        }}
      />
      <div
        className={`${orbClass} floating-orb-2`}
        style={{
          width: 420,
          height: 420,
          bottom: "-5%",
          right: "-4%",
          background: "radial-gradient(circle, hsl(263 70% 45% / 0.22), transparent 72%)",
        }}
      />
      <div
        className={`${orbClass} floating-orb-3`}
        style={{
          width: 350,
          height: 350,
          top: "40%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(circle, hsl(180 55% 48% / 0.16), transparent 72%)",
        }}
      />
      {vivid && (
        <div
          className={`${orbClass} floating-orb-4`}
          style={{
            width: 280,
            height: 280,
            top: "12%",
            right: "8%",
            background: "radial-gradient(circle, hsl(38 92% 58% / 0.14), transparent 70%)",
          }}
        />
      )}
    </div>
  );
};

export default FloatingOrbs;
