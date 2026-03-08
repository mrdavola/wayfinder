import { GoogleGenerativeAI } from "@google/generative-ai";

const PANORAMIC_PREFIX =
  "Generate a high-quality equirectangular panoramic photograph (2:1 aspect ratio, for 360-degree sphere projection). The image should be a seamless wrap-around environment as if taken by a 360° camera. Photorealistic, detailed, well-lit, vibrant colors. NO text or words in the image. ";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imagePrompt } = req.body || {};

  if (!imagePrompt) {
    return res.status(400).json({ error: "imagePrompt is required" });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    });

    const result = await model.generateContent(PANORAMIC_PREFIX + imagePrompt);
    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];

    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart) {
      return res.status(500).json({ error: "No image returned from Gemini" });
    }

    return res.status(200).json({
      base64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    });
  } catch (err) {
    console.error("Gemini image generation error:", err);
    return res.status(500).json({ error: "Image generation failed" });
  }
}
