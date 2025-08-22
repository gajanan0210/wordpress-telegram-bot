const fetch = require("node-fetch");
const fs = require("fs");

// Config
const BOT_TOKEN = "add-bot-token-here";
const CHAT_ID = "add-group-chat-id-here";
const WP_URL = "website-url-here"; // your WordPress site
const GEMINI_API_KEY = "gemini-api-key-here";

const HISTORY_FILE = "lastId.json";
let lastPostedId = loadLastPostedId();

// --- Utility: Load last ID from file
function loadLastPostedId() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
      return data.lastId || null;
    }
  } catch (err) {
    console.error("⚠️ Error reading history file:", err);
  }
  return null;
}

// --- Utility: Save last ID to file
function saveLastPostedId(id) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify({ lastId: id }));
  } catch (err) {
    console.error("⚠️ Error saving history file:", err);
  }
}

// --- Clean Gemini output so Telegram accepts it
function sanitizeForTelegram(text, link) {
  if (!text) return "";

  const safeLink = encodeURI(link);

  return text
    .replace(/```html/g, "")
    .replace(/```/g, "")
    .replace(/<p>/g, "")
    .replace(/<\/p>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/<ul>/g, "")
    .replace(/<\/ul>/g, "")
    .replace(/<li>/g, "• ")
    .replace(/<\/li>/g, "\n")
    // Replace any <a ...>Apply Here</a> with our safe one
    .replace(/<a[^>]*>Apply Here<\/a>/gi, `👉 <a href="${safeLink}">Apply Here</a>`)
    // Fallback: ensure any dangling <a> is closed
    .replace(/<a([^>]*)>/g, "<a$1>")
    .trim();
}

// 1. Fetch latest WordPress posts
async function getLatestJobs() {
  const res = await fetch(
    `${WP_URL}/wp-json/wp/v2/posts?per_page=10&_fields=id,title,content,link,date`
  );
  return await res.json();
}

// 2. Ask Gemini API to create a summary
async function generateSummary(title, content, link) {
  const prompt = `
Write a short professional Telegram job post.
Rules:
- Use <b>bold</b> for job title or key phrases.
- Use plain text or simple bullets (like "•").
- Do NOT use Markdown (* or _).
- Do NOT use <p>, <ul>, <li>.
- Always end with 👉 <a href="${encodeURI(link)}">Apply Here</a>

Job Title: ${title}
Job Description: ${content.rendered}
`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    console.log("Gemini API raw response:", JSON.stringify(data, null, 2));

    const rawText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      `📌 <b>${title}</b>\n👉 <a href="${encodeURI(link)}">Apply Here</a>`;

    return sanitizeForTelegram(rawText, link);
  } catch (err) {
    console.error("⚠️ Gemini API failed:", err);
    return `📌 <b>${title}</b>\n👉 <a href="${encodeURI(link)}">Apply Here</a>`;
  }
}

// 3. Send to Telegram
async function sendToTelegram(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const result = await res.json();
  console.log("Telegram response:", result);
}

// 4. Monitor loop
async function monitorJobs() {
  try {
    const jobs = await getLatestJobs();

    // Sort oldest → newest so multiple jobs post in correct order
    jobs.sort((a, b) => new Date(a.date) - new Date(b.date));

    let newJobs = jobs.filter(job => lastPostedId === null || job.id > lastPostedId);

    if (newJobs.length > 0) {
      console.log(`🆕 Found ${newJobs.length} new job(s)`);

      for (const job of newJobs) {
        console.log("Posting:", job.title.rendered);

        const summary = await generateSummary(
          job.title.rendered,
          job.content,
          job.link
        );

        await sendToTelegram(summary);

        lastPostedId = job.id;
        saveLastPostedId(job.id); // ✅ update history after each post
      }
    }
  } catch (err) {
    console.error("❌ Error in monitor:", err);
  }
}

// Run every 1 minute
setInterval(monitorJobs, 60 * 1000);

console.log("🚀 Monitoring started... waiting for new posts...");
