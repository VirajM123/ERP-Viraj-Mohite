import { hashPassword, isPasswordHash } from "./auth.js";

// Collection operations are injected to support isolated synthetic tests.
export async function migrateCredentialCollection(collection, { apply = false } = {}) {
  const counts = { active: 0, bcrypt: 0, legacy: 0, migrated: 0, requiresReset: 0, changedConcurrently: 0 };
  for await (const user of collection.find({ isActive: true }, { projection: { password: 1 } })) {
    counts.active++;
    const password = user.password;
    if (typeof password === "string" && isPasswordHash(password)) { counts.bcrypt++; continue; }
    if (typeof password !== "string" || !password || /^\$2/i.test(password) || Buffer.byteLength(password, "utf8") > 72) {
      counts.requiresReset++;
      continue;
    }
    counts.legacy++;
    if (apply) {
      const result = await collection.updateOne(
        { _id: user._id, isActive: true, password },
        { $set: { password: await hashPassword(password), oldPassword: "" }, $inc: { sessionVersion: 1 } }
      );
      if (result.modifiedCount) counts.migrated++;
      else counts.changedConcurrently++;
    }
  }
  return counts;
}
