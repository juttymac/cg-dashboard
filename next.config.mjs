/** @type {import('next').NextConfig} */
export default {
  async headers() {
    // Unlisted URL for now: keep it out of search engines.
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};
