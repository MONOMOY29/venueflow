# 🏟️ VenueFlow — AI Smart Venue Navigator

> **Real-time crowd intelligence, dynamic exit dispatching, and multimodal venue navigation for high-capacity stadiums and arenas.**

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Google Gemini API](https://img.shields.io/badge/AI-Google%20Gemini%202.5%20Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![Docker Ready](https://img.shields.io/badge/Container-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tested with Jest](https://img.shields.io/badge/Tested%20with-Jest%20%26%20Supertest-C21325?style=flat-square&logo=jest&logoColor=white)](https://jestjs.io/)

---

## 📌 Problem & Operational Domain
During the conclusion of massive stadium events (such as cricket tournaments, football matches, or stadium tours), 50,000 to 80,000 attendees exit into bottlenecked concourses simultaneously. This triggers severe transit platform delays, gate choke points, and emergency safety hazards.

**VenueFlow** coordinates attendee dispersion by ingesting simulated gate queue lengths, transit intervals, and facility wait times, routing attendees through conversational AI to the least congested exits.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    User([Event Attendee / Client]) -->|HTTP / SPA| Express[Express Application Gateway]
    Express --> Helmet[Helmet CSP & Security Shield]
    Express --> Limiter[express-rate-limit 30 req/min]
    
    subgraph Routing Engine
      Express --> Health["/health (Cloud Run Probe)"]
      Express --> VenueAPI["/api/venue (Simulated IoT Gate Telemetry)"]
      Express --> ChatAPI["/api/chat (Context-Preserved Session Handler)"]
    end
    
    ChatAPI --> GeminiClient[Google Generative AI SDK]
    GeminiClient --> GeminiModel[Gemini 2.5 Flash Engine]
    GeminiModel -.->|System Prompt & Dynamic Egress Rules| GeminiClient
    GeminiClient --> User