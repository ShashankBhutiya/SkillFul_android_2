import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface CompanionMascotProps {
  message: string;
  triggerKey: string | number;
}

export const CompanionMascot = ({ message, triggerKey }: CompanionMascotProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3500); // Stays for 3.5 seconds, then fades out
    return () => clearTimeout(timer);
  }, [triggerKey]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={`companion-${triggerKey}`}
          initial={{ y: 50, x: -10, opacity: 0 }}
          animate={{ y: 0, x: 0, opacity: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
          className="fixed bottom-24 left-4 md:left-8 z-[60] pointer-events-none flex items-end gap-2"
        >
          {/* Mascot Character (Smaller version) */}
          <motion.div
            animate={{ 
              y: [0, -4, 0],
              rotate: [-3, 3, -3]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 2.5,
              ease: "easeInOut"
            }}
            className="w-12 h-12 shrink-0 relative"
          >
            {/* Body */}
            <div className="absolute inset-0 bg-primary rounded-[1.5rem] rounded-bl-lg shadow-lg border border-primary-foreground/20 overflow-hidden">
              {/* Face Area */}
              <div className="absolute top-1.5 left-1.5 right-1.5 bottom-1.5 bg-white/20 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center gap-1.5">
                {/* Eyes */}
                <div className="w-1.5 h-2 bg-primary-foreground rounded-full animate-pulse" />
                <div className="w-1.5 h-2 bg-primary-foreground rounded-full animate-pulse" />
              </div>
              {/* Beak */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-0.5 w-2 h-2 bg-orange-400 rotate-45 rounded-sm" />
            </div>
            {/* Ears */}
            <div className="absolute -top-1 left-1 w-2 h-3 bg-primary rounded-t-full -rotate-12 -z-10" />
            <div className="absolute -top-1 right-1 w-2 h-3 bg-primary rounded-t-full rotate-12 -z-10" />
          </motion.div>

          {/* Speech Bubble */}
          <motion.div
            initial={{ scale: 0, originX: 0, originY: 1 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", damping: 15 }}
            className="relative bg-card/95 backdrop-blur-sm text-foreground px-3 py-1.5 rounded-2xl rounded-bl-sm shadow-lg border border-border"
          >
            <p className="font-display font-semibold text-xs leading-tight">
              {message}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
