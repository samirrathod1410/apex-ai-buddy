import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Real web search. Requires one of the supported providers to be configured
// as a backend secret. If none is configured we say so plainly.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || !query.trim()) {
      return new Response(JSON.stringify({ error: "A search query is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const TAVILY = Deno.env.get("TAVILY_API_KEY");
    const BRAVE = Deno.env.get("BRAVE_SEARCH_API_KEY");

    if (!TAVILY && !BRAVE) {
      return new Response(
        JSON.stringify({
          error: "not_configured",
          message:
            "Web search is not configured yet. Add a TAVILY_API_KEY or BRAVE_SEARCH_API_KEY secret to enable it.",
        }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let results: { title: string; url: string; snippet: string }[] = [];

    if (TAVILY) {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TAVILY,
          query,
          max_results: 5,
          search_depth: "basic",
}),
      });
      if (!r.ok) throw new Error(`Search provider error (${r.status})`);
      const j = await r.json();
      results = (j.results || []).map((x: any) => ({
        title: x.title,
        url: x.url,
        snippet: x.content,
      }));
    } else if (BRAVE) {
      const r = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
        { headers: { Accept: "application/json", "X-Subscription-Token": BRAVE } },
      );
      if (!r.ok) throw new Error(`Search provider error (${r.status})`);
      const j = await r.json();
      results = (j.web?.results || []).map((x: any) => ({
        title: x.title,
        url: x.url,
        snippet: x.description,
      }));
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("web-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
