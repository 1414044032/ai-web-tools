import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUIStore } from '@/stores';

export const LoadingOverlay: React.FC = () => {
  const { isLoading, loadingMessage } = useUIStore();

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-8 flex flex-col items-center shadow-2xl"
          >
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-700 font-medium">
              {loadingMessage || '加载中...'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay;
