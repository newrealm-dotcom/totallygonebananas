/** Where a newsletter signup continues: sign-in with the address filled in, then the stand. */
export function newsletterContinuePath(email: string): string {
  const params = new URLSearchParams({
    next: "/profile?newsletter=1",
    intent: "newsletter",
    email: email.trim(),
  });
  return `/login?${params.toString()}`;
}
