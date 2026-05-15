import { motion } from 'framer-motion';

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-gray-950 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] animate-pulse delay-700" />

      <div className="relative flex flex-col items-center">
        {/* Animated Logo Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{
            opacity: { duration: 0.5 },
            scale: { 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className="relative mb-8"
        >
          {/* Pulsing ring around logo */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full border-4 border-blue-500/20"
          />
          
          <img 
            src="/JVDlogo-removebg-preview.png" 
            alt="JVD Logo" 
            className="h-24 md:h-32 object-contain relative z-10 drop-shadow-2xl" 
          />
        </motion.div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.5em] animate-pulse">
            System Synchronizing
          </p>
          
          {/* Modern Progress Bar */}
          <div className="w-48 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              animate={{ 
                x: [-200, 200]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-1/2 h-full bg-gradient-to-r from-transparent via-blue-600 to-transparent"
            />
          </div>
        </div>
      </div>

      {/* Brand Name */}
      <div className="absolute bottom-12 text-center">
        <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em]">
          JVD Events & Travels
        </p>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
          Management System v2.0
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
