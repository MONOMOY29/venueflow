const express = require("express");
const router = express.Router();

// Simulated venue data — in production, connect to IoT sensors / event APIs
function generateVenueData() {
  const baseTime = Date.now();
  const hour = new Date().getHours();

  // Simulate crowd peaks at event end times (e.g., 21:00–22:30)
  const isPeakHour = hour >= 21 || hour <= 1;

  const gates = [
    {
      id: "G1",
      name: "North Gate 1",
      section: "North Stand",
      crowdLevel: isPeakHour ? randomInt(75, 95) : randomInt(20, 50),
      waitMinutes: isPeakHour ? randomInt(12, 25) : randomInt(1, 5),
      isOpen: true,
      transport: ["metro_blue", "bus_42"],
    },
    {
      id: "G2",
      name: "North Gate 2",
      section: "North Stand",
      crowdLevel: isPeakHour ? randomInt(70, 90) : randomInt(15, 45),
      waitMinutes: isPeakHour ? randomInt(10, 22) : randomInt(1, 4),
      isOpen: true,
      transport: ["metro_blue"],
    },
    {
      id: "G5",
      name: "South Gate 5",
      section: "South Stand",
      crowdLevel: isPeakHour ? randomInt(30, 55) : randomInt(5, 25),
      waitMinutes: isPeakHour ? randomInt(3, 8) : randomInt(0, 2),
      isOpen: true,
      transport: ["shuttle_A", "bus_15"],
    },
    {
      id: "G6",
      name: "South Gate 6",
      section: "South Stand",
      crowdLevel: isPeakHour ? randomInt(25, 50) : randomInt(5, 20),
      waitMinutes: isPeakHour ? randomInt(2, 7) : randomInt(0, 2),
      isOpen: true,
      transport: ["shuttle_A", "shuttle_B"],
    },
    {
      id: "G9",
      name: "East Gate 9",
      section: "East Block",
      crowdLevel: isPeakHour ? randomInt(80, 98) : randomInt(30, 60),
      waitMinutes: isPeakHour ? randomInt(15, 30) : randomInt(2, 8),
      isOpen: true,
      transport: ["metro_green", "bus_88"],
    },
    {
      id: "G12",
      name: "West Gate 12",
      section: "West Block",
      crowdLevel: isPeakHour ? randomInt(20, 40) : randomInt(5, 15),
      waitMinutes: isPeakHour ? randomInt(1, 5) : randomInt(0, 1),
      isOpen: true,
      transport: ["metro_green", "shuttle_C"],
    },
  ];

  const transport = [
    {
      id: "metro_blue",
      name: "Metro – Blue Line",
      type: "metro",
      crowdLevel: isPeakHour ? randomInt(70, 95) : randomInt(20, 50),
      nextArrival: randomInt(2, 12),
      frequency: "every 4 min",
      destination: "City Central",
    },
    {
      id: "metro_green",
      name: "Metro – Green Line",
      type: "metro",
      crowdLevel: isPeakHour ? randomInt(30, 60) : randomInt(10, 30),
      nextArrival: randomInt(1, 6),
      frequency: "every 5 min",
      destination: "Airport / South Hub",
    },
    {
      id: "shuttle_A",
      name: "Shuttle A – South Lot",
      type: "shuttle",
      crowdLevel: isPeakHour ? randomInt(40, 70) : randomInt(10, 30),
      nextArrival: randomInt(3, 10),
      frequency: "every 8 min",
      destination: "South Parking / Drop Zone",
    },
    {
      id: "shuttle_B",
      name: "Shuttle B – West Lot",
      type: "shuttle",
      crowdLevel: isPeakHour ? randomInt(20, 45) : randomInt(5, 20),
      nextArrival: randomInt(2, 8),
      frequency: "every 10 min",
      destination: "West Parking",
    },
    {
      id: "shuttle_C",
      name: "Shuttle C – Express",
      type: "shuttle",
      crowdLevel: isPeakHour ? randomInt(15, 35) : randomInt(5, 15),
      nextArrival: randomInt(1, 5),
      frequency: "every 6 min",
      destination: "Hotel Zone / City Centre",
    },
    {
      id: "bus_42",
      name: "City Bus #42",
      type: "bus",
      crowdLevel: isPeakHour ? randomInt(60, 85) : randomInt(20, 40),
      nextArrival: randomInt(5, 20),
      frequency: "every 15 min",
      destination: "Downtown",
    },
    {
      id: "bus_15",
      name: "City Bus #15",
      type: "bus",
      crowdLevel: isPeakHour ? randomInt(35, 65) : randomInt(10, 25),
      nextArrival: randomInt(3, 15),
      frequency: "every 12 min",
      destination: "East Suburbs",
    },
  ];

  const facilities = [
    { id: "F1", name: "Restroom Block A", section: "North", queueLen: randomInt(0, 15) },
    { id: "F2", name: "Restroom Block B", section: "South", queueLen: randomInt(0, 8) },
    { id: "F3", name: "Food Court 1", section: "Main Concourse", queueLen: randomInt(2, 20) },
    { id: "F4", name: "Food Court 2", section: "Level 2", queueLen: randomInt(0, 10) },
    { id: "F5", name: "First Aid", section: "Gate 5 Lobby", queueLen: 0 },
    { id: "F6", name: "Lost & Found", section: "Main Office", queueLen: 0 },
  ];

  return {
    venue: {
      name: "Grand Arena",
      event: "IPL Cricket Final 2026",
      capacity: 60000,
      attendance: randomInt(50000, 55000),
      status: isPeakHour ? "PEAK_EGRESS" : "NORMAL",
      lastUpdated: new Date().toISOString(),
    },
    gates,
    transport,
    facilities,
    alert: isPeakHour
      ? {
          level: "HIGH",
          message:
            "Peak crowd movement detected. Use South or West gates for fastest exit. Avoid North Gates 1-3.",
        }
      : null,
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// GET /api/venue/status
router.get("/status", (req, res) => {
  res.json(generateVenueData());
});

// GET /api/venue/recommend?section=North
router.get("/recommend", (req, res) => {
  const { section } = req.query;
  const data = generateVenueData();

  let recommendedGates = data.gates
    .filter((g) => g.isOpen)
    .sort((a, b) => a.crowdLevel - b.crowdLevel)
    .slice(0, 3);

  if (section) {
    const sectionGates = data.gates.filter((g) =>
      g.section.toLowerCase().includes(section.toLowerCase())
    );
    if (sectionGates.length) {
      recommendedGates = [
        ...sectionGates.sort((a, b) => a.crowdLevel - b.crowdLevel).slice(0, 1),
        ...recommendedGates.filter((g) => !sectionGates.includes(g)).slice(0, 2),
      ];
    }
  }

  res.json({
    section: section || "All",
    recommendedGates,
    topTransport: data.transport
      .sort((a, b) => a.crowdLevel - b.crowdLevel)
      .slice(0, 3),
    alert: data.alert,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
