import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

router.get("/api/connections/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const response = await fetch(`https://www.nytimes.com/svc/connections/v2/${date}.json`);

    if (!response.ok) {
      return res.status(404).json({ error: "Game not found for this date" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching connections data:", error);
    res.status(500).json({ error: "Failed to fetch game data" });
  }
});

export default router;
