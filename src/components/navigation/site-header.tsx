import { SiteHeaderClient } from "@/components/navigation/site-header-client";
import { getCurrentAccessContext } from "@/lib/permissions/access";

export async function SiteHeader() {
  const access = await getCurrentAccessContext().catch(() => null);
  return (
    <SiteHeaderClient
      session={access ? { displayName: access.displayName, role: access.role } : null}
    />
  );
}
