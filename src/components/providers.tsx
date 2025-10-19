"use client";

import { NextUIProvider } from "@nextui-org/react";
import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppNavigation } from "./app-navigation";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <SessionProvider>
      <NextUIProvider navigate={router.push}>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
          <AppNavigation />
          <main className="pt-16">
            {children}
          </main>
        </div>
      </NextUIProvider>
    </SessionProvider>
  );
}
