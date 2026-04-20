# 🏟️ VenueFlow — AI-Powered Smart Venue Navigator

> Built for **Virtual: PromptWars** · Google for Developers × Hack2Skill

VenueFlow is an AI-powered crowd management and real-time navigation assistant for large-scale events (IPL matches, concerts, festivals). It helps 60,000+ attendees exit safely and efficiently using **Google Gemini AI** and live venue data.

---

## 🎯 Problem Statement: Physical Event Experience

When massive sporting events end, tens of thousands of people try to exit simultaneously, causing:
- **Severe crowd bottlenecks** at main exit gates
- **Transport overload** — sudden spikes for metro, bus, ride-shares
- **General confusion** — no real-time info on which routes are clear

VenueFlow solves this with an intelligent AI assistant that guides attendees in real time.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Chat Assistant** | Google Gemini 1.5 Flash — answers exit, transport & navigation questions |
| 🚪 **Live Gate Status** | Real-time crowd density and wait times for all exits |
| 🚇 **Transport Tracker** | Metro, shuttle, bus availability with next arrival times |
| ⚠️ **Smart Alerts** | Automatic peak-crowd warnings and alternative route suggestions |
| 🗺️ **Section-Based Routing** | Personalised guidance based on your seat section |
| 📱 **Mobile-First Design** | Fully accessible, responsive on any screen size |

---

## 🛠️ Tech Stack

- **AI**: Google Gemini 1.5 Flash (`@google/generative-ai`)
- **Backend**: Node.js 20 + Express 4
- **Security**: Helmet, express-rate-limit, CORS
- **Testing**: Jest + Supertest
- **Deployment**: Docker + Google Cloud Run

---

## 🚀 Quickstart (Local)

### Prerequisites
- Node.js ≥ 18
- A [Google Gemini API key](https://makersuite.google.com/app/apikey)

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/venueflow.git
cd venueflow
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 3. Run development server
npm run dev

# 4. Open in browser
open http://localhost:8080
```

---

## 🧪 Running Tests

```bash
npm test              # Run all tests with coverage
npm run test:watch    # Watch mode
```

---

## ☁️ Deploy to Google Cloud Run

### Prerequisites
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- A GCP project with Cloud Run & Container Registry APIs enabled

```bash
# 1. Set your project
export PROJECT_ID=your-gcp-project-id
export REGION=asia-south1   # nearest to India

# 2. Build and push image
gcloud builds submit --tag gcr.io/$PROJECT_ID/venueflow

# 3. Deploy to Cloud Run
gcloud run deploy venueflow \
  --image gcr.io/$PROJECT_ID/venueflow \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10

# 4. Get the deployed URL
gcloud run services describe venueflow --region $REGION --format 'value(status.url)'
```

---

## 📁 Project Structure

```
venueflow/
├── server.js              # Express app entry point
├── src/
│   ├── routes/
│   │   ├── chat.js        # Gemini AI chat endpoint
│   │   └── venue.js       # Live venue data API
│   └── middleware/
│       └── errorHandler.js
├── public/
│   └── index.html         # Single-page frontend
├── tests/
│   └── server.test.js     # Jest + Supertest tests
├── Dockerfile             # Cloud Run optimised image
├── .env.example
└── package.json
```

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check (Cloud Run probe) |
| `/api/chat` | POST | Send a message to Gemini AI |
| `/api/venue/status` | GET | Live venue crowd data |
| `/api/venue/recommend` | GET | Exit & transport recommendations |

### Chat Example
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I am in North Stand Row 12. What is the quickest exit?"}'
```

---

## ♿ Accessibility

- Semantic HTML5 with ARIA labels throughout
- Live regions for dynamic chat and alerts (`aria-live`)
- Keyboard navigation fully supported
- WCAG 2.1 colour contrast compliant

---

## 🏆 Built For

**Virtual: PromptWars** by Google for Developers & Hack2Skill  
Challenge: *Physical Event Experience*  
Tags: `#BuildwithAI` `#PromptWarsVirtual`
