/**
 * Smoke-test public routes + key HTML signals for full-stack marketplace.
 * Usage: node scripts/smoke-fullstack.mjs [baseUrl]
 */
const base = (process.argv[2] || "https://ever-shop-red.vercel.app").replace(
  /\/$/,
  "",
);

const routes = [
  { path: "/", expect: [/Shop the catalog/i, /home-hero/i] },
  { path: "/shop", expect: [/shop|product|catalog/i] },
  { path: "/login", expect: [/Sign in|Welcome back|password/i] },
  { path: "/register", expect: [/Create account|Sign up|password/i] },
  { path: "/sell", expect: [/sell|vendor|shop/i] },
  { path: "/cart", expect: [/cart|bag|empty/i] },
  { path: "/checkout", expect: [/Sign in|Checkout|login/i] },
  { path: "/categories", expect: [/categor/i] },
  { path: "/robots.txt", expect: [/User-agent|Allow|Disallow/i] },
  { path: "/sitemap.xml", expect: [/urlset|url/i] },
];

let failed = 0;
for (const r of routes) {
  const url = `${base}${r.path}`;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { Accept: "text/html,application/xml,text/plain,*/*" },
    });
    const text = await res.text();
    const okStatus = res.status >= 200 && res.status < 400;
    const okBody = r.expect.every((re) => re.test(text));
    if (!okStatus || !okBody) {
      failed += 1;
      console.log(
        `FAIL ${r.path} status=${res.status} bodyMatch=${okBody} len=${text.length}`,
      );
    } else {
      console.log(`OK   ${r.path} (${res.status})`);
    }
  } catch (e) {
    failed += 1;
    console.log(`FAIL ${r.path} ${e instanceof Error ? e.message : e}`);
  }
}

console.log(failed === 0 ? "\nAll smoke checks passed." : `\n${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
