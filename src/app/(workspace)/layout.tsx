import { requireUser } from "@/lib/session";
import { Shell } from "@/components/layout/shell";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <Shell user={{ name: user.name, email: user.email }}>{children}</Shell>
  );
}
