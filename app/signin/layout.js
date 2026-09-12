// /signin is the one page an anonymous visitor is allowed to see, which makes
// it the one page a crawler can actually reach. A sign-in form is not a
// search result anyone wants, so keep it out.
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SignInLayout({ children }) {
  return children;
}
