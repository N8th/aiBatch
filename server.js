const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve frontend files

const API_TOKEN = "r8_AVDDuHw9Nl5LWm1yDNdEEkQ1jDziOMr2yHlIv"; // Replace with real API key

// ✅ Model Versions
const MODEL_VERSIONS = {
  nstr: "97ca4e84c0432035c4ede3e2c48ba733c3cd549fc564bdbf9bfe42a8310914ab",
  n8th: "2da4c3abb7168c58da3c19b9c57f13c42189f34cd2f29667169bd8928a9bbfdf",
  jstr: "4ea67571c5404d76ae65866a14df03a5b3cb4db8d73adb182b0dd97b8bf64859",
  dar: "b6e71b98882c476368a18fa5fc5ac565f67da02bc918dfcf0cf30cd03ace2650",
};

// ✅ Subject Prefixes
const SUBJECT_PREFIXES = {
  nstr: "young man nstr",
  n8th: "little boy n8th",
  jstr: "young female jstr",
  dar: "young man dar",
  none: 1,
};

// ✅ Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Handle missing favicon request
app.get("/favicon.ico", (req, res) => res.status(204).end());

// ✅ Generate images for all four models
app.post("/generate-images", async (req, res) => {
  try {
    // Extract input values
    const {
      prompt,
      seed,
      num_outputs,
      output_quality,
      guidance_scale,
      num_inference_steps,
      aspect_ratio,
      output_format,
    } = req.body.input;

    // Convert `seed` to an integer (if provided)
    const validSeed = seed ? parseInt(seed) : undefined;

    // Clamp values to their valid ranges
    const validNumOutputs = Math.min(4, Math.max(1, num_outputs));
    const validQuality = Math.min(100, Math.max(0, output_quality));
    const validGuidanceScale = Math.min(10, Math.max(0, guidance_scale));
    const validInferenceSteps = Math.min(50, Math.max(1, num_inference_steps));

    const baseInput = {
      seed: validSeed,
      num_outputs: validNumOutputs,
      output_quality: validQuality,
      guidance_scale: validGuidanceScale,
      num_inference_steps: validInferenceSteps,
      aspect_ratio: aspect_ratio || "1:1",
      output_format: output_format || "webp",
    };

    // Generate request bodies dynamically for all models
    const models = Object.keys(MODEL_VERSIONS);
    const requests = models.map((model) => ({
      version: MODEL_VERSIONS[model],
      input: {
        ...baseInput,
        prompt: prompt.replace(/\(subject\)/g, SUBJECT_PREFIXES[model]), // Add correct prefix
      },
    }));

    // Send all requests simultaneously
    const responses = await Promise.all(
      requests.map((request) =>
        axios.post("https://api.replicate.com/v1/predictions", request, {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: "wait",
          },
        })
      )
    );

    // Return response data
    const result = {};
    models.forEach((model, i) => {
      result[model] = responses[i].data;
    });

    res.json(result);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch data from Replicate" });
  }
});

// ✅ Get statuses for all four images
app.get("/generate-image-status/:id1/:id2/:id3/:id4", async (req, res) => {
  const { id1, id2, id3, id4 } = req.params;
  try {
    const responses = await Promise.all(
      [id1, id2, id3, id4].map((id) =>
        axios.get(`https://api.replicate.com/v1/predictions/${id}`, {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        })
      )
    );

    res.json({
      nstr: {
        status: responses[0].data.status,
        output: responses[0].data.output || [],
      },
      n8th: {
        status: responses[1].data.status,
        output: responses[1].data.output || [],
      },
      jstr: {
        status: responses[2].data.status,
        output: responses[2].data.output || [],
      },
      dar: {
        status: responses[3].data.status,
        output: responses[3].data.output || [],
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to get prediction status" });
  }
});

app.listen(5000, () =>
  console.log("✅ Server running on http://localhost:5000")
);
