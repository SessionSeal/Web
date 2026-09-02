// Same-origin streaming proxy to the FastAPI backend.
//
// This exists instead of a next.config rewrite because the dev rewrite proxy
// buffers request bodies with a 10MB cap (real .logicx uploads are hundreds
// of MB, and the truncation left the backend waiting forever). A route
// handler receives the body as a stream and pipes it straight through.

const BACKEND = "http://127.0.0.1:8000";

async function proxy(req, ctx) {
  const { path = [] } = await ctx.params;
  const url = new URL(req.url);
  const target = `${BACKEND}/${path.map(encodeURIComponent).join("/")}${url.search}`;

  const headers = new Headers(req.headers);
  // hop-by-hop / connection-level headers must not be forwarded
  // ("expect" in particular: curl sends 100-continue, undici rejects it)
  for (const h of ["host", "connection", "expect", "keep-alive",
                   "transfer-encoding", "upgrade", "proxy-connection",
                   "content-length"]) {
    headers.delete(h);
  }

  const init = { method: req.method, headers, redirect: "manual" };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    init.duplex = "half"; // required by undici for streamed request bodies
  }

  const res = await fetch(target, init);
  const outHeaders = new Headers(res.headers);
  outHeaders.delete("content-encoding");
  outHeaders.delete("content-length");
  return new Response(res.body, { status: res.status, headers: outHeaders });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as OPTIONS,
};
