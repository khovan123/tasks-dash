"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    const initial =
      stored ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "dark");
    setTheme(initial);
    if (initial === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-sm" className="size-8">
        <Sun className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      className="size-8"
      title={
        theme === "dark"
          ? "Chuyển sang giao diện Sáng (Light)"
          : "Chuyển sang giao diện Tối (Dark)"
      }
      aria-label="Chuyển chế độ giao diện"
    >
      {theme === "dark" ? (
        <Sun className="size-4 text-primary transition-transform duration-300 hover:rotate-90" />
      ) : (
        <Moon className="size-4 text-primary transition-transform duration-300 hover:-rotate-45" />
      )}
    </Button>
  );
}
