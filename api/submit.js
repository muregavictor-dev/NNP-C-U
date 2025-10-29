export default async function handler(req, res) {
  const response = await fetch("https://script.google.com/macros/s/AKfycbxQuEBJoOkmprwnhiyW9yOpuB48uRmXZwV5qCk_nAjaE_dl5uQzt123-gE8aXtIKFk7/exec", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body)
  });

  const data = await response.text();

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).send(data);
}
