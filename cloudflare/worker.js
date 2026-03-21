export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const bodyText = await request.text();

    const gasUrl = "https://script.google.com/macros/s/AKfycbzMKJI4Eiu0TZrdsIYrTlsxXC2G2BXr04HgKBnjqHToK1me4ZV5-6X99d7PGYflwnx_/exec";

    const upstream = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: bodyText,
      redirect: "follow"
    });

    const text = await upstream.text();

    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};