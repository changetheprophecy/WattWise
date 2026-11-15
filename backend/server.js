
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB configuration
const client = new MongoClient(process.env.MONGODB_URI);

let db;
let readingsCollection;

// Home route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to WattWise API!",
  });
});

// Backend health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "WattWise Backend",
    status: "Online",
    database: db ? "Connected" : "Disconnected",
  });
});

// Receive readings from ESP32
app.post("/api/readings", async (req, res) => {
  try {
    const {
      deviceId,
      voltage,
      current,
      power,
      energy,
      powerFactor,
    } = req.body;

    const values = [
      voltage,
      current,
      power,
      energy,
      powerFactor,
    ];

    if (
      !deviceId ||
      !values.every(
        (value) =>
          typeof value === "number" &&
          Number.isFinite(value)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid sensor data",
      });
    }

    const reading = {
      deviceId,
      voltage,
      current,
      power,
      energy,
      powerFactor,
      timestamp: new Date(),
    };

    const result = await readingsCollection.insertOne(reading);

    console.log("New reading saved:", reading);

    res.status(201).json({
      success: true,
      message: "Reading saved successfully",
      data: {
        ...reading,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Error saving reading:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save reading",
    });
  }
});

// Get latest sensor reading
app.get("/api/readings/latest", async (req, res) => {
  try {
    const reading = await readingsCollection.findOne(
      {},
      { sort: { timestamp: -1 } }
    );

    if (!reading) {
      return res.status(404).json({
        success: false,
        message: "No readings available yet",
      });
    }

    res.json({
      success: true,
      data: reading,
    });
  } catch (error) {
    console.error("Error fetching reading:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch reading",
    });
  }
});

// Get historical sensor readings
app.get("/api/readings/history", async (req, res) => {
  try {
    const { deviceId, limit } = req.query;

    // Build filter query
    const filter = {};
    if (typeof deviceId === "string" && deviceId.trim() !== "") {
      filter.deviceId = deviceId.trim();
    }

    // Validate limit parameter strictly as a positive integer (fallback to default 50, clamp to max 500)
    const DEFAULT_LIMIT = 50;
    const MAX_LIMIT = 500;
    let parsedLimit = DEFAULT_LIMIT;

    if (limit !== undefined) {
      const isPositiveInteger =
        typeof limit === "string" && /^[1-9]\d*$/.test(limit.trim());
      if (isPositiveInteger) {
        parsedLimit = Math.min(parseInt(limit, 10), MAX_LIMIT);
      } else {
        parsedLimit = DEFAULT_LIMIT;
      }
    }

    // Query readings with secondary sort on _id for deterministic ordering
    const readings = await readingsCollection
      .find(filter)
      .sort({ timestamp: -1, _id: -1 })
      .limit(parsedLimit)
      .toArray();

    // Return in chronological order (oldest first)
    readings.reverse();

    res.json({
      success: true,
      count: readings.length,
      data: readings,
    });
  } catch (error) {
    console.error("Error fetching readings history:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch readings history",
    });
  }
});

// Connect database before starting server
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await client.connect();

    db = client.db();
    readingsCollection = db.collection("readings");

    console.log("MongoDB Atlas connected successfully!");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`WattWise server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
