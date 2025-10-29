export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // ✅ Forward data to your Google Apps Script Web App
    const scriptUrl = "https://script.google.com/macros/s/AKfycbxQuEBJoOkmprwnhiyW9yOpuB48uRmXZwV5qCk_nAjaE_dl5uQzt123-gE8aXtIKFk7/exec";

    const params = new URLSearchParams({
      name: req.body.name,
      regNumber: req.body.regNumber,
      phone: req.body.phone,
      group: req.body.group
    });

    const response = await fetch(scriptUrl, {
      method: "POST",
      body: params
    });

    const text = await response.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(text);

  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Failed to submit form" });
  }
}
