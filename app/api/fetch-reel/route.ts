import { NextRequest, NextResponse } from "next/server";

function extractShortcode(url: string): string | null {
  const m = url.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
  return m ? m[2] : null;
}

function parseHashtags(text: string): string {
  return (text.match(/#[A-Za-z0-9_]+/g) ?? []).join(" ");
}

function parseCta(text: string): string {
  const patterns = [
    /comment\s+\w+/i,
    /dm\s+(me|us|for)/i,
    /link\s+in\s+(bio|profile)/i,
    /save\s+this/i,
    /follow\s+for/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return "";
}

function stripHashtags(text: string): string {
  return text.replace(/#[A-Za-z0-9_]+/g, "").replace(/\s{2,}/g, " ").trim();
}

export async function POST(req: NextRequest) {
  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!url?.includes("instagram.com")) {
    return NextResponse.json({ error: "Not an Instagram URL" }, { status: 400 });
  }

  const shortcode = extractShortcode(url);

  // Try oEmbed first — returns title (caption snippet) and author
  try {
    const oembed = await fetch(
      `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}&omitscript=true`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (oembed.ok) {
      const data = await oembed.json() as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      };

      const caption = data.title ?? "";
      return NextResponse.json({
        success: true,
        source: "oembed",
        url,
        shortcode,
        author: data.author_name ?? "",
        caption: stripHashtags(caption),
        hashtags: parseHashtags(caption),
        cta_used: parseCta(caption),
        thumbnail_url: data.thumbnail_url ?? null,
      });
    }
  } catch {
    // fall through to HTML scrape
  }

  // Fallback: scrape og meta tags from public page
  try {
    const page = await fetch(`https://www.instagram.com/reel/${shortcode}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (page.ok) {
      const html = await page.text();
      const desc =
        html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/)?.[1] ??
        html.match(/<meta\s+content="([^"]+)"\s+property="og:description"/)?.[1] ??
        "";
      const author =
        html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/)?.[1] ??
        html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/)?.[1] ??
        "";
      const caption = desc
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");

      return NextResponse.json({
        success: true,
        source: "html",
        url,
        shortcode,
        author: author.replace(/ on Instagram.*$/i, "").trim(),
        caption: stripHashtags(caption),
        hashtags: parseHashtags(caption),
        cta_used: parseCta(caption),
        thumbnail_url: null,
      });
    }
  } catch {
    // fall through
  }

  // Return partial result — at least the URL is known
  return NextResponse.json({
    success: true,
    source: "url_only",
    url,
    shortcode,
    author: "",
    caption: "",
    hashtags: "",
    cta_used: "",
    thumbnail_url: null,
  });
}
