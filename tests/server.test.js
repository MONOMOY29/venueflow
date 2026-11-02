const request = require("supertest");

// Mock Gemini SDK prior to importing server
jest.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockReturnValue({
          startChat: jest.fn().mockReturnValue({
            sendMessage: jest.fn().mockResolvedValue({
              response: {
                text: () => "Mocked route: Head towards West Gate 12 for the quickest exit.",
              },
            }),
          }),
        }),
      };
    }),
  };
});

const app = require("../server");

// ── Health Check ──────────────────────────────────────────────────────────────
describe("GET /health", () => {
  it("returns 200 with healthy status", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.service).toBe("VenueFlow");
    expect(res.body.version).toBe("1.0.0");
    expect(res.body.timestamp).toBeDefined();
  });
});

// ── Venue API ─────────────────────────────────────────────────────────────────
describe("GET /api/venue/status", () => {
  it("returns venue data with required fields", async () => {
    const res = await request(app).get("/api/venue/status");
    expect(res.statusCode).toBe(200);
    expect(res.body.venue).toBeDefined();
    expect(res.body.gates).toBeInstanceOf(Array);
    expect(res.body.transport).toBeInstanceOf(Array);
    expect(res.body.facilities).toBeInstanceOf(Array);
  });

  it("venue object has correct structure", async () => {
    const res = await request(app).get("/api/venue/status");
    const { venue } = res.body;
    expect(venue.name).toBe("Grand Arena");
    expect(typeof venue.capacity).toBe("number");
    expect(typeof venue.attendance).toBe("number");
    expect(venue.attendance).toBeLessThanOrEqual(venue.capacity);
    expect(venue.lastUpdated).toBeDefined();
  });

  it("gates have required fields and valid constraints", async () => {
    const res = await request(app).get("/api/venue/status");
    res.body.gates.forEach((gate) => {
      expect(gate.id).toBeDefined();
      expect(gate.name).toBeDefined();
      expect(typeof gate.crowdLevel).toBe("number");
      expect(gate.crowdLevel).toBeGreaterThanOrEqual(0);
      expect(gate.crowdLevel).toBeLessThanOrEqual(100);
      expect(typeof gate.waitMinutes).toBe("number");
      expect(typeof gate.isOpen).toBe("boolean");
    });
  });

  it("transport items have required fields", async () => {
    const res = await request(app).get("/api/venue/status");
    res.body.transport.forEach((t) => {
      expect(t.id).toBeDefined();
      expect(t.name).toBeDefined();
      expect(["metro", "shuttle", "bus"]).toContain(t.type);
      expect(typeof t.nextArrival).toBe("number");
    });
  });
});

describe("GET /api/venue/recommend", () => {
  it("returns recommendation without section parameter", async () => {
    const res = await request(app).get("/api/venue/recommend");
    expect(res.statusCode).toBe(200);
    expect(res.body.recommendedGates).toBeInstanceOf(Array);
    expect(res.body.topTransport).toBeInstanceOf(Array);
    expect(res.body.timestamp).toBeDefined();
  });

  it("returns recommendation for North section", async () => {
    const res = await request(app).get("/api/venue/recommend?section=North");
    expect(res.statusCode).toBe(200);
    expect(res.body.section).toBe("North");
    expect(res.body.recommendedGates.length).toBeGreaterThan(0);
  });

  it("returns recommendation for unknown section gracefully", async () => {
    const res = await request(app).get("/api/venue/recommend?section=UnknownXYZ");
    expect(res.statusCode).toBe(200);
    expect(res.body.recommendedGates).toBeInstanceOf(Array);
  });
});

// ── Chat API ──────────────────────────────────────────────────────────────────
describe("POST /api/chat", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-mock-api-key";
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it("returns 400 if message is missing", async () => {
    const res = await request(app).post("/api/chat").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 if message is an empty string", async () => {
    const res = await request(app).post("/api/chat").send({ message: "   " });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 if message is not a string", async () => {
    const res = await request(app).post("/api/chat").send({ message: 42 });
    expect(res.statusCode).toBe(400);
  });

  it("returns 503 if GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app).post("/api/chat").send({ message: "Hello" });
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toContain("GEMINI_API_KEY");
  });

  it("returns 200 and mocked reply when API key is configured", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ message: "How do I exit from North section?" });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toContain("West Gate 12");
    expect(res.body.sessionId).toBeDefined();
  });

  it("clears a session on DELETE /api/chat/:sessionId", async () => {
    const res = await request(app).delete("/api/chat/test-session-id");
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Session cleared.");
  });
});

// ── Static Frontend & Fallback ────────────────────────────────────────────────
describe("Static frontend", () => {
  it("serves index.html at root /", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  it("falls back to index.html for SPA routes", async () => {
    const res = await request(app).get("/some/deep/route");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });
});

// ── Security Headers (Helmet) ─────────────────────────────────────────────────
describe("Security headers (Helmet)", () => {
  it("includes x-content-type-options header", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("includes x-frame-options header", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-frame-options"]).toBeDefined();
  });
});
