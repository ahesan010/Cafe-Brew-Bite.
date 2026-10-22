// Sends a WhatsApp thank-you + receipt when an order becomes "served".
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
admin.initializeApp();

const WA_TOKEN = defineSecret("WA_TOKEN");
const WA_PHONE_ID = defineSecret("WA_PHONE_ID");
const GRAPH_VERSION = "v23.0"; // check Meta's changelog and update if it is retired
const TEMPLATE_NAME = "order_receipt"; // must match the approved template name
const TEMPLATE_LANG = "en";

const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
// WhatsApp template values must be a single line.
const clean = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

exports.sendWhatsAppReceipt = onDocumentUpdated(
  {
    document: "orders/{id}",
    region: "asia-south1",
    secrets: [WA_TOKEN, WA_PHONE_ID],
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    // Only when the status just changed to served, the customer opted in, and nothing was sent yet.
    if (!after || before.status === after.status || after.status !== "served")
      return;
    if (!after.waOptIn || after.waSent) return;

    const to =
      "91" +
      String(after.phone || "")
        .replace(/\D/g, "")
        .slice(-10);
    const items = (after.items || []).map((i) => i.q + "× " + i.n).join(", ");
    const how = after.pay === "upi" ? "Paid via UPI" : "Paid at counter";
    const params = [
      after.name,
      "#" + event.params.id.slice(-4),
      after.table,
      items,
      inr(after.total),
      how,
    ];

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${WA_PHONE_ID.value()}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + WA_TOKEN.value(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: TEMPLATE_NAME,
            language: { code: TEMPLATE_LANG },
            components: [
              {
                type: "body",
                parameters: params.map((p) => ({
                  type: "text",
                  text: clean(p),
                })),
              },
            ],
          },
        }),
      },
    );
    const json = await res.json().catch(() => ({}));
    await event.data.after.ref.update(
      res.ok
        ? { waSent: true }
        : {
            waError: clean((json.error && json.error.message) || "send failed"),
          },
    );
  },
);
