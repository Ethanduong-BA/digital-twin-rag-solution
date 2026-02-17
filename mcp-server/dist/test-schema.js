import { compareProfileWithJobTool } from "./dist/server.js";
console.log("Tool Schema:");
console.log(JSON.stringify(compareProfileWithJobTool, null, 2));
// Validate schema
const schema = compareProfileWithJobTool.inputSchema;
console.log("\nValidation:");
console.log("- type:", schema.type);
console.log("- properties keys:", Object.keys(schema.properties || {}));
console.log("- required:", schema.required);
console.log("- job_filename type:", schema.properties?.job_filename?.type);
