import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/acompanhar/"] },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://forno-studio-portfolio-seven.vercel.app"}/sitemap.xml`,
  };
}
