import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Lazy Firebase Admin Init
  let adminApp: admin.app.App | null = null;
  function getAdmin() {
    if (!adminApp) {
      // In this environment, we might not have a service account key file.
      // We'll try to initialize with project ID and let it use ADC.
      try {
        adminApp = admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      } catch (err) {
        console.error("Firebase Admin Init Failed:", err);
      }
    }
    return adminApp;
  }

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Example Coin Transaction API
  app.post("/api/coins/claim-daily", async (req, res) => {
    const { idToken } = req.body;
    const admin = getAdmin();
    if (!admin) return res.status(500).json({ error: "Backend unavailable" });

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const db = admin.firestore();
      
      const userRef = db.collection("users").doc(uid);
      
      await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) {
          throw new Error("User not found");
        }
        const currentCoins = userDoc.data()?.coins || 0;
        t.update(userRef, { 
          coins: currentCoins + 100,
          updatedAt: FieldValue.serverTimestamp()
        });
      });

      res.json({ success: true, reward: 100 });
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
