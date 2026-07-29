import { spawn, spawnSync } from "node:child_process";

function findPython() {
  for (const candidate of ["python", "python3"]) {
    const result = spawnSync(candidate, ["--version"], {
      stdio: "ignore",
      shell: process.platform === "win32",
    });
    if (result.status === 0) return candidate;
  }
  console.error("No se encontro Python. No se puede iniciar el backend FastAPI de NORTHMINE.");
  process.exit(1);
}

const python = findPython();
const port = process.env.PORT || "8080";
const isWindows = process.platform === "win32";
const defaultDbDir = isWindows ? "." : "/tmp";

const env = {
  ...process.env,
  ENVIRONMENT: process.env.ENVIRONMENT || "demo",
  NORTHMINE_MODE: process.env.NORTHMINE_MODE || "demo",
  NORTHMINE_DATA_MODE: process.env.NORTHMINE_DATA_MODE || "DEMO",
  NORTHMINE_DEMO_MODE: process.env.NORTHMINE_DEMO_MODE || "true",
  NORTHMINE_ALLOW_DEMO_LOGIN: process.env.NORTHMINE_ALLOW_DEMO_LOGIN || "true",
  NORTHMINE_LOCAL_AUTO_SYNC_ENABLED: process.env.NORTHMINE_LOCAL_AUTO_SYNC_ENABLED || "false",
  NORTHMINE_AUDIT_DB: process.env.NORTHMINE_AUDIT_DB || `${defaultDbDir}/northmine_demo_audit.db`,
  NORTHMINE_USERS_DB: process.env.NORTHMINE_USERS_DB || `${defaultDbDir}/northmine_demo_users.db`,
};

const child = spawn(
  python,
  [
    "-m",
    "uvicorn",
    "app.main:app",
    "--app-dir",
    "backend",
    "--host",
    "0.0.0.0",
    "--port",
    port,
  ],
  {
    stdio: "inherit",
    shell: isWindows,
    env,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code || 0);
});
