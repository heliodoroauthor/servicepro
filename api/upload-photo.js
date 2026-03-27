// Vercel Serverless Function — POST /api/upload-photo
// Uploads image to Cloudinary and returns the secure URL
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { image, folder } = req.body || {};

  if (!image) {
    return res.status(400).json({ error: "Missing 'image' field (base64 data URL)" });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: "Cloudinary credentials not configured" });
  }

  try {
    // Generate signature for authenticated upload
    const timestamp = Math.floor(Date.now() / 1000);
    const uploadFolder = folder || "servicepro/equipment";

    // Build params for signing
    const params = `folder=${uploadFolder}&timestamp=${timestamp}`;

    // Create SHA-1 signature
    const crypto = await import("crypto");
    const signature = crypto
      .createHash("sha1")
      .update(params + apiSecret)
      .digest("hex");

    // Upload to Cloudinary
    const formData = new URLSearchParams();
    formData.append("file", image);
    formData.append("folder", uploadFolder);
    formData.append("timestamp", String(timestamp));
    formData.append("api_key", apiKey);
    formData.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Cloudinary error:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Cloudinary upload failed",
      });
    }

    return res.status(200).json({
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
