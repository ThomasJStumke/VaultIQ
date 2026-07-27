import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../lib/utils';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      onClick={toggleTheme}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-surface-tint rounded-xl transition-all group mb-2"
    >
      <span className="flex items-center gap-3">
        <AnimatePresence mode="wait" initial={false}>
          {isLight ? (
            <motion.span
              key="sun"
              initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
              transition={{ duration: 0.25 }}
              className="flex"
            >
              <Sun className="w-5 h-5 text-amber-500" />
            </motion.span>
          ) : (
            <motion.span
              key="moon"
              initial={{ opacity: 0, rotate: 90, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -90, scale: 0.6 }}
              transition={{ duration: 0.25 }}
              className="flex"
            >
              <Moon className="w-5 h-5 text-indigo-400" />
            </motion.span>
          )}
        </AnimatePresence>
        {isLight ? 'Light Mode' : 'Dark Mode'}
      </span>

      <span
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors duration-300 shrink-0',
          isLight ? 'bg-indigo-500' : 'bg-surface-tint-strong border border-border'
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm',
            isLight ? 'left-4' : 'left-0.5'
          )}
        />
      </span>
    </button>
  );
}
