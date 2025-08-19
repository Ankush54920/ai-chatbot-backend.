import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sqlite3 from "sqlite3";
import fetch from "node-fetch";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// SQLite DB
const db = new sqlite3.Database("chat.db");
db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, nickname TEXT, role TEXT, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");

// Chat endpoint
app.post("/chat", async (req, res) => {
  const { nickname, message } = req.body;

  // Save user message
  db.run("INSERT INTO messages (nickname, role, content) VALUES (?, ?, ?)", [nickname, "user", message]);

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "sonar-small-online",
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No reply";

    // Save assistant reply
    db.run("INSERT INTO messages (nickname, role, content) VALUES (?, ?, ?)", [nickname, "assistant", reply]);

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logs endpoint
app.get("/logs", (req, res) => {
  db.all("SELECT * FROM messages ORDER BY created_at DESC", [], (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
