"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className="p-4 bg-white dark:bg-gray-900 relative overflow-hidden transition-colors duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-md group rounded-full"
      onClick={toggleTheme}
    >
      <Sun className="absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 rotate-0 scale-100 dark:-rotate-90 dark:scale-0 text-yellow-500 group-hover:text-yellow-600 group-hover:translate-y-[2px] group-hover:rotate-12" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 rotate-90 scale-0 dark:rotate-0 dark:scale-100 dark:text-blue-300 group-hover:dark:text-blue-400 group-hover:dark:translate-y-[2px] group-hover:dark:rotate-12" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
