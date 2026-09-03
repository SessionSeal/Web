import { redirect } from "next/navigation";

// Deprecated: the wizard moved from /app to the root of app.sessionseal.com.
export default function DeprecatedAppPath() {
  redirect("/");
}
