require("dotenv").config();

const { MongoClient } = require("mongodb");

async function testConnection() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();

        console.log("✅ Connected to MongoDB Atlas!");

        const db = client.db("wattwise");

        await db.command({ ping: 1 });

        console.log("✅ Database ping successful!");
    } catch (error) {
        console.error("❌ MongoDB connection failed:");
        console.error(error);
    } finally {
        await client.close();
    }
}

testConnection();