#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get project name from arguments
const projectName = process.argv[2];

if (!projectName) {
  console.log("Please specify a project name:");
  console.log("   npx create-fynix-app my-app");
  process.exit(1);
}

const projectPath = path.join(process.cwd(), projectName);

// Check if directory already exists
if (fs.existsSync(projectPath)) {
  console.log(`Directory "${projectName}" already exists.`);
  process.exit(1);
}

console.log(`\n Creating Fynix app in ${projectPath}...\n`);

// Copy template folder
const templatePath = path.join(__dirname, "template");

try {
  copyDir(templatePath, projectPath);

  // Update package.json with project name
  const packageJsonPath = path.join(projectPath, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  packageJson.name = projectName;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  console.log("Project created successfully!\n");
  console.log("Installing dependencies (npm install)...\n");
  const installResult = spawnSync("npm", ["install"], {
    cwd: projectPath,
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (installResult.status !== 0) {
    console.log(" npm install failed. Please run 'npm install' manually inside the project directory.\n");
  } else {
    console.log(" Dependencies installed!\n");
  }
  console.log(" Next steps:\n");
  console.log(`   cd ${projectName}`);
  if (installResult.status !== 0) {
    console.log("   npm install");
  }
  console.log("   npm run dev\n");
  console.log(" Happy coding with Fynix!\n");
} catch (error) {
  console.error(" Error creating project:", error.message);
  process.exit(1);
}

// Recursive directory copy function
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
