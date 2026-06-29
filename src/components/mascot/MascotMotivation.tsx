import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface MascotMotivationProps {
  message: string;
  onDismiss: () => void;
}

export const MascotMotivation = ({ message, onDismiss }: MascotMotivationProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 50, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 50, scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative w-full max-w-sm"
      >
        <div className="flex items-end gap-4 mb-4">
          {/* Mascot Character (Stylized Owl/Fox using pure CSS/SVG) */}
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              rotate: [-2, 2, -2]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 2,
              ease: "easeInOut"
            }}
            className="w-20 h-20 shrink-0 relative"
          >
            {/* Body */}
            <div className="absolute inset-0 bg-primary rounded-[2.5rem] rounded-bl-xl shadow-lg border-2 border-primary-foreground/20 overflow-hidden">
              {/* Face Area */}
              <div className="absolute top-3 left-2 right-2 bottom-3 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center gap-2">
                {/* Eyes */}
                <div className="w-3 h-4 bg-primary-foreground rounded-full animate-pulse" />
                <div className="w-3 h-4 bg-primary-foreground rounded-full animate-pulse" />
              </div>
              {/* Beak */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-1 w-3 h-3 bg-orange-400 rotate-45 rounded-sm" />
            </div>
            {/* Ears */}
            <div className="absolute -top-2 left-2 w-4 h-6 bg-primary rounded-t-full -rotate-12 -z-10" />
            <div className="absolute -top-2 right-2 w-4 h-6 bg-primary rounded-t-full rotate-12 -z-10" />
          </motion.div>

          {/* Speech Bubble */}
          <motion.div
            initial={{ scale: 0, originX: 0, originY: 1 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", damping: 15 }}
            className="relative bg-card text-foreground p-4 rounded-3xl rounded-bl-sm shadow-xl border border-border"
          >
            <p className="font-display font-bold text-lg leading-tight">
              {message}
            </p>
          </motion.div>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onDismiss}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
        >
          Keep Going <Check className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
