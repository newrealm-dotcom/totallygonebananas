import { getViewer } from "@/lib/queries";
import { DeferredSignupFloatButton } from "@/components/DeferredChrome";

export async function SignupFloat() {
  const { userId } = await getViewer();
  if (userId) return null;
  return <DeferredSignupFloatButton />;
}
