import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ADMIN_EMAIL = Deno.env.get("SUPPORT_ADMIN_EMAIL") ?? "rimuru2178@gmail.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") ?? "support@inkroad.app";

serve(async (request) => {
  try {
    const payload = await request.json();

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [ADMIN_EMAIL],
        subject: `[INKROAD 문의] ${payload.subject}`,
        text: [
          `ticketId: ${payload.ticketId}`,
          `userId: ${payload.userId}`,
          `email: ${payload.email}`,
          `category: ${payload.category}`,
          "",
          payload.message,
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return new Response(JSON.stringify({ ok: false, error: body }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
