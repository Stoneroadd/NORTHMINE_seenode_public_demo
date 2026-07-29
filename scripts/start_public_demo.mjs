import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const isWindows = process.platform === "win32";

function commandName(command) {
  if (isWindows && command === "npm") return "npm.cmd";
  return command;
}

function commandOk(command, args, options = {}) {
  const result = spawnSync(commandName(command), args, {
    stdio: "ignore",
    ...options,
  });
  return result.status === 0;
}

function findPython() {
  const localVenvPython = isWindows
    ? resolve(".venv", "Scripts", "python.exe")
    : resolve(".venv", "bin", "python");
  if (existsSync(localVenvPython) && commandOk(localVenvPython, ["--version"])) {
    return localVenvPython;
  }

  const candidates = isWindows ? ["python.exe", "python", "py"] : ["python3", "python"];
  for (const candidate of candidates) {
    if (commandOk(candidate, ["--version"])) return candidate;
  }
  console.error("No se encontro Python. No se puede iniciar el backend FastAPI de NORTHMINE.");
  process.exit(1);
}

function run(command, args, options = {}) {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(commandName(command), args, {
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function ensureUvicorn(python) {
  if (commandOk(python, ["-c", "import uvicorn"])) return;

  console.warn("uvicorn no esta instalado; instalando backend/requirements.txt antes de iniciar.");
  if (!commandOk(python, ["-m", "pip", "--version"])) {
    run(python, ["-m", "ensurepip", "--upgrade"]);
  }

  const pipArgs = python.includes(`${resolve(".venv")}`) || python.includes("/.venv/")
    ? ["-m", "pip", "install", "-r", "backend/requirements.txt"]
    : ["-m", "pip", "install", "--user", "-r", "backend/requirements.txt"];
  const install = spawnSync(commandName(python), pipArgs, {
    stdio: "inherit",
  });
  if (install.status === 0 && commandOk(python, ["-c", "import uvicorn"])) return;

  run(python, ["-m", "pip", "install", "--break-system-packages", "--user", "-r", "backend/requirements.txt"]);
}

const python = findPython();
const port = process.env.PORT || "8080";
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

ensureUvicorn(python);

const child = spawn(
  commandName(python),
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
