import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true } };

export default async function AdminAreaLayout({ children }: { children: ReactNode }) {
  await requireProfileRole(["admin"]);
  return children;
}
