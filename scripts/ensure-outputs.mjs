// Amplify writes amplify_outputs.json during the cloud build (or `npx ampx
// sandbox` / `npx ampx generate outputs` locally). When it's missing, write
// an empty stub so the app still builds and runs; features that need AWS
// (orders, reviews, admin, analytics) then report themselves as not configured.
import { existsSync, writeFileSync } from "node:fs";

const file = "amplify_outputs.json";
if (!existsSync(file)) {
  writeFileSync(file, JSON.stringify({ version: "1.4" }, null, 2) + "\n");
  console.log(`[ensure-outputs] ${file} missing – wrote an empty stub (AWS features disabled).`);
}
