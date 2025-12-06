import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/wrapped/:username", (req, res) => {
  const { username } = req.params;
  // Stubbed response; replace with real GitHub data + metrics
  res.json({
    username,
    generatedAt: new Date().toISOString(),
    basicStats: {},
    flexStats: {},
    roastStats: {},
    notes: "Replace with real computation pipeline."
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

