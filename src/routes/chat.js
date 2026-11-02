const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// In-memory session store (use Redis in production for horizontal scaling)
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ── Gemini Client Configuration ────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const ACTIVE_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// ── System Prompt ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are VenueFlow AI — a smart, real-time crowd management assistant for large-scale sports events, concerts, and festivals. You help attendees navigate venues safely, efficiently, and enjoyably.

YOUR CORE CAPABILITIES:
1. Dynamic Exit Routing: Recommend the least-congested exits based on seat section and real-time crowd density
2. Transport Coordination: Provide live public transit updates (metro, bus, shuttle, ride-share) with estimated wait times
3. In-Venue Navigation: Guide attendees to restrooms, food stalls, medical aid, and other facilities with shortest queues
4. Crowd Alerts: Warn about bottlenecks, overcrowded areas, and suggest safer alternatives
5. Event Timing: Advise optimal times to leave to avoid peak-hour rush
6. Emergency Guidance: Provide clear evacuation routes and emergency contact information

TONE & STYLE:
- Be concise, clear, and action-oriented.
- Use emojis sparingly for rapid scanning (🚪 exits, 🚇 metro, 🚌 bus, ⚠️ alerts).
- Always suggest 2-3 viable alternatives.
- Ensure responses are readable at a glance on mobile screens.

Always tailor advice to the user's seat section if provided. If no section is given, provide general venue guidance and inquire about their section.`;

// ── Helper: Cleanup expired sessions with unref() to prevent Jest leaks ─────────
function pruneExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}
const sessionPruneTimer = setInterval(pruneExpiredSessions, 5 * 60 * 1000);
if (sessionPruneTimer.unref) {
  sessionPruneTimer.unref();
}

// ── POST /api/chat ─────────────────────────────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message field is required." });
    }

    const trimmed = message.trim().slice(0, 1000);
    if (!trimmed) {
      return res.status(400).json({ error: "Message cannot be empty." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: "AI service not configured. Please set GEMINI_API_KEY environment variable.",
      });
    }

    // Resolve or initialize session
    const sid = sessionId && sessions.has(sessionId) ? sessionId : uuidv4();
    if (!sessions.has(sid)) {
      sessions.set(sid, { history: [], lastActive: Date.now() });
    }
    const session = sessions.get(sid);
    session.lastActive = Date.now();

    const model = genAI.getGenerativeModel({
      model: ACTIVE_MODEL,
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
    const responseText = result.response.text();

    session.history.push(
      { role: "user", parts: [{ text: trimmed }] },
      { role: "model", parts: [{ text: responseText }] }
    );

    // Context buffer window: retain last 20 conversational turns
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
