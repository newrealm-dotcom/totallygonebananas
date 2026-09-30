import Link from "next/link";
import { getViewer } from "@/lib/queries";

export async function SignupFloat() {
  const { userId } = await getViewer();
  if (userId) return null;

  return (
    <Link className="signup-float" href="/login">
      Sign up for a free account
    </Link>
  );
}
