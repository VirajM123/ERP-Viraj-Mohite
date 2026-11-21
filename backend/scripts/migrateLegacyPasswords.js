// Dry-run by default. Run with --apply after backing up the database.
import dotenv from "dotenv";
import mongoose from "mongoose";
import { migrateCredentialCollection } from "../legacyPasswordMigration.js";

dotenv.config();
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
const apply = process.argv.includes("--apply");
await mongoose.connect(process.env.MONGODB_URI);
try {
  for (const name of ["Mas_Register", "Mas_User"]) {
    const counts = await migrateCredentialCollection(mongoose.connection.collection(name), { apply });
    console.log(JSON.stringify({ collection: name, mode: apply ? "apply" : "dry-run", ...counts }));
  }
} finally {
  await mongoose.disconnect();
}
