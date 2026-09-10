# AURA — Adaptive Urban Resource Assistant

A responsive React + Vite recreation of the AURA interface, upgraded with a waste-focused assistant with a built-in offline knowledge base, optional Gemini enhancement, and image-based waste analysis.

# LIVE DEMO LINK
https://aura-eco.netlify.app/

## What is actually AI-powered now?

- **Ask → AURA Eco-Assistant:** works **without any API key** using a built-in waste knowledge base. It is strictly limited to waste and waste-management topics and politely refuses unrelated questions. If Gemini is configured, it can optionally add a more flexible AI answer for waste questions not covered specifically by the built-in knowledge base.
- **Upload Waste:** sends the selected image to Gemini Vision and returns the detected item, recommended action, confidence, rationale and a sustainability tip.
- **Camera Scan:** captures a camera frame and sends that image to the same vision endpoint.
- The API key stays on the **Netlify server/function**, not in the browser code.

Gemini's current GenerateContent API supports both multi-turn text generation and image inputs, including inline base64 image data. citeturn1view0turn1search2

## API is optional for the Ask page

The Ask page is designed to keep working even if Gemini is unavailable. The built-in answers cover common waste topics and the scope filter blocks unrelated questions. Gemini is only an optional enhancement for open-ended waste questions.

The **Upload Waste** and **Camera Scan** AI image-analysis features still use the Gemini endpoint and therefore require `GEMINI_API_KEY`.

## 1. Install

```bash
npm install
```

## 2. Optional: add your Gemini API key

Create a Gemini API key in Google AI Studio, then add it to Netlify as:

```text
GEMINI_API_KEY=your_key_here
```

Do **not** put the real key in `src/`, `VITE_...` variables, or commit it to GitHub. Netlify Functions can read server-side environment variables at runtime.

For local testing with the function, use Netlify Dev:

```bash
npx netlify dev
```

Then open the local URL printed by Netlify. The normal `npm run dev` command only starts Vite, so the AI function endpoint will not exist unless you proxy/run the Netlify function too.

## 3. Build for deployment

```bash
npm run build
```

The included `netlify.toml` configures `dist` as the publish directory and `netlify/functions` as the Functions directory.

## Camera

The camera uses `getUserMedia`. On phones/tablets it initially requests the rear/environment camera; on laptops it can use the built-in camera. The Switch Camera button lets the user change cameras.

Camera access requires a secure context: `localhost` works for development, while a deployed site should use HTTPS.

## Chat scope

AURA is intentionally **not a general-purpose chatbot**. It answers waste and directly related questions, including recycling, segregation, composting, disposal, e-waste, hazardous waste, food waste, circular economy, municipal waste, waste technology, and practical waste-management projects. Questions unrelated to waste are politely refused.

## Important limitation

AI identification is **visual inference**, not a certified waste-classification service. The assistant is instructed to be conservative, especially for batteries, chemicals, medical waste, sharps and other hazardous materials. Local recycling rules still need to be checked.
