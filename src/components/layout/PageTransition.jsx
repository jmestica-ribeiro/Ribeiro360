import { useRef } from 'react';
import { motion } from 'framer-motion';

const PageTransition = ({ children }) => {
  const ref = useRef(null);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      onAnimationComplete={() => { if (ref.current) ref.current.style.transform = 'none'; }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
