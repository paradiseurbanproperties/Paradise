import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireActiveProfile } from "@/lib/permissions/access";

export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true } };

export default async function ClientAreaLayout({ children }: { children: ReactNode }) {
  await requireActiveProfile();
  return children;
}
