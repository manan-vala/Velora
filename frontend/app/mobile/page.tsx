import { RequireAuth } from "@/components/auth/RequireAuth";
import Visualiser from "@/components/mobile/visualiser";

export default function MobilePage() {
  return (
    <RequireAuth>
      <Visualiser />
    </RequireAuth>
  );
}
