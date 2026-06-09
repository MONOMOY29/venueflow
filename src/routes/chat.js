const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// In-memory session store (use Redis in production for multi-instance scaling)
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ── Gemini Client ──────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ── System Prompt ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are VenueFlow AI — a smart, real-time crowd management assistant for large-scale sports events, concerts, and festivals. You help attendees navigate venues safely, efficiently, and enjoyably.

YOUR CORE CAPABILITIES:
1. **Dynamic Exit Routing**: Recommend the least-congested exits based on seat section and real-time crowd density
2. **Transport Coordination**: Provide live public transit updates (metro, bus, shuttle, ride-share) with estimated wait times
3. **In-Venue Navigation**: Guide attendees to restrooms, food stalls, medical aid, and other facilities with shortest queues
4. **Crowd Alerts**: Warn about bottlenecks, overcrowded areas, and suggest safer alternatives
5. **Event Timing**: Advise optimal times to leave to avoid peak-hour rush (e.g., "Leave 10 mins before final whistle to beat the crowd")
6. **Emergency Guidance**: Provide clear evacuation routes and emergency contact information

TONE & STYLE:
- Be concise, clear, and action-oriented
- Use emojis sparingly but effectively for quick scanning (🚪 for exits, 🚇 for metro, 🚌 for bus, ⚠️ for alerts)
- Always provide 2-3 alternatives when possible
- Responses should be readable at a glance on a mobile screen

EXAMPLE VENUE CONTEXT (simulate real-time data when asked):
- Venue: "Grand Arena" (capacity: 60,000)
- Current attendance: ~52,000 (87% full)
- Event: IPL Cricket Final
- Peak crowd sections: North Stand (Gates 1-3), East Block (Gates 7-9)
- Clear exits: South Gate 12, West Gate 15 (under 2-minute wait)
- Metro: Blue Line platform has 25-min queue; Green Line is clear
- Shuttles: Running every 8 minutes from South Lot B

Always tailor advice to the user's seat section if provided. If no section is given, ask for it or provide general venue-wide guidance.`;

// ── Helper: cleanup expired sessions ──────────────────────────────────────────
function pruneExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}
// unref() so this background timer never keeps the process (or Jest) alive
const pruneTimer = setInterval(pruneExpiredSessions, 5 * 60 * 1000);
if (typeof pruneTimer.unref === "function") pruneTimer.unref();

// ── POST /api/chat ─────────────────────────────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message field is required." });
    }

    const trimmed = message.trim().slice(0, 1000); // cap at 1000 chars
    if (!trimmed) {
      return res.status(400).json({ error: "Message cannot be empty." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error:
          "AI service not configured. Please set GEMINI_API_KEY environment variable.",
      });
    }

    // Resolve or create session
    const sid = sessionId && sessions.has(sessionId) ? sessionId : uuidv4();
    if (!sessions.has(sid)) {
      sessions.set(sid, { history: [], lastActive: Date.now() });
    }
    const session = sessions.get(sid);
    session.lastActive = Date.now();

    // Build Gemini model & chat
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.7,
        topP: 0.9,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    });

    const chat = model.startChat({ history: session.history });
    const result = await chat.sendMessage(trimmed);

    // If text() throws (e.g. safety-blocked), let it propagate to the
    // centralised error handler, which maps SAFETY/quota/etc. to the right
    // status and message. Only handle the case where it returns empty text.
    const responseText = result.response.text();
    if (!responseText || !responseText.trim()) {
      return res.status(502).json({
        error:
          "AI did not return a response. Please rephrase your question and try again.",
      });
    }

    // Persist history (Gemini format)
    session.history.push(
      { role: "user", parts: [{ text: trimmed }] },
      { role: "model", parts: [{ text: responseText }] }
    );

    // Keep last 20 turns to avoid context overflow
    if (session.history.length > 40) {
      session.history = session.history.slice(-40);
    }

    return res.json({
      reply: responseText,
      sessionId: sid,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/chat/:sessionId ────────────────────────────────────────────────
router.delete("/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  sessions.delete(sessionId);
  res.json({ message: "Session cleared." });
});

module.exports = router;
