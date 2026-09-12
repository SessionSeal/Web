// app.sessionseal.com is the signed-in application, not the storefront.
// Every route in middleware.js bounces an anonymous visitor to /signin, so
// there is nothing here worth indexing. Public SEO belongs to the marketing
// site at www.sessionseal.com, which ships its own robots and sitemap.
//
// Note the deliberate absence of a blanket "Disallow: /". A crawler that is
// blocked from fetching a page can still index the bare URL when someone
// links to it, and it never sees the X-Robots-Tag: noindex we send (see
// next.config.mjs) because it never made the request. Allowing the crawl is
// what lets the noindex actually be read and obeyed.
//
// This matters most for /s/:token, the reviewer share links. Those are
// reachable without a session by design, and a token sitting in a search
// result is a leaked master.
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Machine endpoints: nothing to render, no reason to spend crawl budget.
        disallow: ["/api/", "/backend/"],
      },
    ],
    // No sitemap key, and no app/sitemap.js anywhere, on purpose.
    //
    // A sitemap is a list of URLs you are asking a crawler to go fetch.
    // Every URL on this host answers an anonymous request with a 307 to
    // /signin, so such a list would be an invitation to crawl a pile of
    // redirects. It would also contradict the noindex we send on the same
    // pages: submit and noindex are opposite instructions, and Search
    // Console reports the pair as an error rather than picking a winner.
    //
    // www.sessionseal.com hosts the only sitemap we want. If tool pages
    // like /compress or /verify ever move outside the middleware gate,
    // that is the moment to add a sitemap here, listing those routes only.
  };
}
