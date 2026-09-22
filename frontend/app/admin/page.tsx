import AccountsDashboard from "@/components/admin/AccountsDashboard";
import { RequireAdmin } from "@/components/auth/RequireAdmin";

export const metadata = { title: "User accounts — Velora" };

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AccountsDashboard />
    </RequireAdmin>
  );
}
