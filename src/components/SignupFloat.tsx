import { getViewer } from "@/lib/queries";
import { SignupFloatButton } from "@/components/SignupFloatButton";

export async function SignupFloat() {
  const { userId } = await getViewer();
  if (userId) return null;
  return <SignupFloatButton />;
}
