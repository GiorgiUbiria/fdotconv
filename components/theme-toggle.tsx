'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className="group relative overflow-hidden rounded-full bg-white p-4 transition-colors duration-300 hover:bg-gray-100 hover:shadow-md dark:bg-gray-900 dark:hover:bg-gray-800"
      onClick={toggleTheme}
    >
      <Sun className="absolute h-[1.2rem] w-[1.2rem] rotate-0 scale-100 text-yellow-500 transition-all duration-300 group-hover:translate-y-[2px] group-hover:rotate-12 group-hover:text-yellow-600 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 dark:text-blue-300 group-hover:dark:translate-y-[2px] group-hover:dark:rotate-12 group-hover:dark:text-blue-400" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
