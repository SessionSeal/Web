import { redirect } from "next/navigation";

// The marketing landing moved to the Astro site (Www/, www.sessionseal.com).
// This app is app.sessionseal.com: the root just enters the app — the
// middleware sends signed-out visitors to /signin from there.
export default function Root() {
  redirect("/app");
}
