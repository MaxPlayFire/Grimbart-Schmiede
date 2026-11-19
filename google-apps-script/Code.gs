// Paste this file into an Apps Script project attached to the provided spreadsheet.
function doPost(event) {
  try {
    const order = JSON.parse(event.parameter.payload);
    if (!order.customer.name || !order.customer.email || !order.customer.phone ||
        !order.customer.address || !Array.isArray(order.items) || order.items.length === 0) {
      throw new Error("Missing required order fields.");
    }
    if (order.coupon && ["KAIZER10", "GRIMBART5", "IRON10"].indexOf(order.coupon) === -1) {
      throw new Error("Unknown coupon.");
    }

    const spreadsheet = SpreadsheetApp.openById("1P5gfgBZ3Cf7EpjL5DnoBDSWmfHbBmZRWOkdBDPbyJFQ");
    const sheet = spreadsheet.getSheets()[0];
    const headers = [
      "Order time", "Customer name", "Email", "Phone", "Address",
      "Comment", "Coupon", "Items", "Subtotal", "Discount", "Total"
    ];

    // Create readable columns on the first order only.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    const items = order.items.map((item) =>
      `${item.name} (${item.variant}) × ${item.quantity}${item.warranty ? " + warranty" : ""}`
    ).join("; ");

    // Store customer values as text to prevent spreadsheet formula evaluation.
    sheet.appendRow([
      new Date(),
      safeCell(order.customer.name),
      safeCell(order.customer.email),
      safeCell(order.customer.phone),
      safeCell(order.customer.address),
      safeCell(order.customer.comment),
      safeCell(order.coupon),
      safeCell(items),
      Number(order.subtotal),
      Number(order.discount),
      Number(order.total)
    ]);

    return orderResponse(true);
  } catch (error) {
    console.error(error);
    return orderResponse(false);
  }
}

// Tell the storefront whether the row was written, without cross-origin fetch.
function orderResponse(success) {
  return HtmlService.createHtmlOutput(
    `<script>window.top.postMessage({type:"grimbart-order",success:${success}},"*");</script>`
  );
}

function safeCell(value) {
  const text = String(value || "").trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}
