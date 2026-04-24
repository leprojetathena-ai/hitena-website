const express = require("express");
const admin = require("firebase-admin");
const path = require("path");

// Try both filenames (file may appear as .json.json on Windows)
let serviceAccount;
try { serviceAccount = require("./serviceAccountKey.json"); }
catch { serviceAccount = require("../serviceAccountKey.json.json"); }

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Push a single question document to Firestore
app.post("/push", async (req, res) => {
  const { collection, docName, fields } = req.body;

  if (!collection || !docName || !fields) {
    return res.status(400).json({ error: "Missing collection, docName or fields." });
  }

  try {
    await db.collection(collection).doc(docName).set(fields);
    res.json({ success: true, docName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get the next available order number for a collection + prefix
app.get("/next-order", async (req, res) => {
  const { collection, prefix } = req.query;
  if (!collection || !prefix) return res.status(400).json({ error: "Missing params" });

  try {
    const snap = await db.collection(collection)
      .orderBy(admin.firestore.FieldPath.documentId())
      .startAt(prefix)
      .endAt(prefix + "\uf8ff")
      .get();

    res.json({ nextOrder: snap.size + 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3333;
app.listen(PORT, () => console.log(`Admin panel running at http://localhost:${PORT}/admin`));
