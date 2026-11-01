"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/queries";
import { fieldErrors, roleInput } from "@/lib/validation";
import type { Role } from "@/lib/types";

export async function updateUserRole(raw: unknown): Promise<{ ok: true; role: Role } | { ok: false; errors: Record<string, string> }> {
  const parsed = roleInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { userId, profile, aal } = await getViewer();
  if (!userId || !isAdminRole(profile)) return { ok: false, errors: { form: "Only admins can change roles." } };
  if (aal !== "aal2") return { ok: false, errors: { form: "Please complete multi-factor authentication before changing roles." } };
  if (parsed.data.userId === userId && parsed.data.role !== "admin") {
    return { ok: false, errors: { form: "You can't remove your own admin role." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role: parsed.data.role }).eq("id", parsed.data.userId);
  if (error) return { ok: false, errors: { form: error.message } };

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true, role: parsed.data.role };
}
