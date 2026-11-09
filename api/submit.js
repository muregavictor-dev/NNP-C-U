export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const formData = req.body;
  if (!formData || typeof formData !== "object" || Array.isArray(formData)) {
    return res.status(400).json({ success: false, message: "Invalid form submission" });
  }

  const scriptUrl = "https://script.google.com/macros/s/AKfycbwXL8ak2UmJyNNYuWi2fJgoaLRNUae4AOZLPfBPNjyOM_m-xXs4lMGf-zLnB6QkZ7Ue/exec";
  const params = new URLSearchParams({
    name: String(formData.name || ""),
    regNumber: String(formData.regNumber || ""),
    phone: String(formData.phone || ""),
    group: String(formData.group || "")
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      body: params,
      signal: controller.signal
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, message: "The enrollment service is unavailable. Please try again." });
    }

    let result;
    try {
      result = await response.json();
    } catch {
      return res.status(502).json({ success: false, message: "The enrollment service returned an invalid response." });
    }

    if (!result || result.success !== true) {
      return res.status(502).json({ success: false, message: "The enrollment service could not confirm your submission." });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({ success: true });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return res.status(timedOut ? 504 : 502).json({
      success: false,
      message: timedOut ? "The enrollment service timed out. Please try again." : "Failed to submit your enrollment. Please try again."
    });
  } finally {
    clearTimeout(timeout);
  }
}
