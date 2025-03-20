const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve frontend files

const API_TOKEN = "r8_AVDDuHw9Nl5LWm1yDNdEEkQ1jDziOMr2yHlIv"; // Replace with real API key

// ✅ Model Configuration (Easily Add More Models Here)
const MODEL_CONFIG = {
  nstr: {
    version: "97ca4e84c0432035c4ede3e2c48ba733c3cd549fc564bdbf9bfe42a8310914ab",
    prefix: "young man nstr"
  },
  n8th: {
    version: "2da4c3abb7168c58da3c19b9c57f13c42189f34cd2f29667169bd8928a9bbfdf",
    prefix: "boy n8th"
  },
  jstr: {
    version: "4ea67571c5404d76ae65866a14df03a5b3cb4db8d73adb182b0dd97b8bf64859",
    prefix: "woman jstr"
  },
  gma: {
    version: "7c7ec57346d8ad842373f826d824b4e2fd6d66bacf3c3177e8f7f30c9f5237c8",
    prefix: "woman gma"
  },
  dar: {
    version: "b6e71b98882c476368a18fa5fc5ac565f67da02bc918dfcf0cf30cd03ace2650",
    prefix: "young man dar"
  }
};

// ✅ Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Handle missing favicon request
app.get("/favicon.ico", (req, res) => res.status(204).end());

// ✅ Generate images dynamically for all models
app.post("/generate-images", async (req, res) => {
  try {
    const {
      prompt,
      seed,
      num_outputs,
      output_quality,
      guidance_scale,
      num_inference_steps,
      aspect_ratio,
      output_format
    } = req.body.input;

    const baseInput = {
      seed: seed ? parseInt(seed) : undefined,
      num_outputs: Math.min(4, Math.max(1, num_outputs)),
      output_quality: Math.min(100, Math.max(0, output_quality)),
      guidance_scale: Math.min(10, Math.max(0, guidance_scale)),
      num_inference_steps: Math.min(50, Math.max(1, num_inference_steps)),
      aspect_ratio: aspect_ratio || "1:1",
      output_format: output_format || "webp"
    };

    // Generate request bodies dynamically for all models
    const requests = Object.keys(MODEL_CONFIG).map(model => ({
      version: MODEL_CONFIG[model].version,
      input: {
        ...baseInput,
        prompt: prompt.replace(/\(subject\)/g, MODEL_CONFIG[model].prefix)
      }
    }));

    // Send all requests simultaneously
    const responses = await Promise.all(
      requests.map(request =>
        axios.post("https://api.replicate.com/v1/predictions", request, {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: "wait"
          }
        })
      )
    );

    // Construct response data
    const result = {};
    Object.keys(MODEL_CONFIG).forEach((model, i) => {
      result[model] = responses[i].data;
    });

    res.json(result);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch data from Replicate" });
  }
});

// ✅ Get statuses dynamically for all images
app.get("/generate-image-status/:ids", async (req, res) => {
  const ids = req.params.ids.split(",");

  try {
    const responses = await Promise.all(
      ids.map(id =>
        axios.get(`https://api.replicate.com/v1/predictions/${id}`, {
          headers: { Authorization: `Bearer ${API_TOKEN}` }
        })
      )
    );

    const result = {};
    Object.keys(MODEL_CONFIG).forEach((model, i) => {
      result[model] = { status: responses[i].data.status, output: responses[i].data.output || [] };
    });

    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to get prediction status" });
  }
});

app.listen(5000, () => console.log("✅ Server running on http://localhost:5000"));
