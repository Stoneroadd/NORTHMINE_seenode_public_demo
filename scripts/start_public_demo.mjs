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

function tryRun(command, args, options = {}) {
  console.log(`> ${command} ${args.join(" ")}`);
  return spawnSync(commandName(command), args, {
    stdio: "inherit",
    ...options,
  });
}

function installAptPythonTooling() {
  if (isWindows) return false;
  if (tryRun("apt-get", ["--version"]).status !== 0) return false;
  if (tryRun("apt-get", ["update"]).status !== 0) return false;
  return tryRun("apt-get", ["install", "-y", "python3-pip", "python3-venv"]).status === 0;
}

function ensureUvicorn(python) {
  if (commandOk(python, ["-c", "import uvicorn"])) return;

  const requirementsFile = process.env.NORTHMINE_REQUIREMENTS_FILE || "backend/requirements.seenode.txt";
  console.warn(`uvicorn no esta instalado; instalando ${requirementsFile} antes de iniciar.`);
  if (!commandOk(python, ["-m", "pip", "--version"])) {
    const ensurePip = tryRun(python, ["-m", "ensurepip", "--upgrade"]);
    if (ensurePip.status !== 0 && !installAptPythonTooling()) {
      console.error("No se pudo instalar pip para Python antes de iniciar.");
      process.exit(1);
    }
  }

  const pipArgs = python.includes(`${resolve(".venv")}`) || python.includes("/.venv/")
    ? ["-m", "pip", "install", "-r", requirementsFile]
    : ["-m", "pip", "install", "-r", requirementsFile];
  const install = spawnSync(commandName(python), pipArgs, {
    stdio: "inherit",
  });
  if (install.status === 0 && commandOk(python, ["-c", "import uvicorn"])) return;

  run(python, ["-m", "pip", "install", "--break-system-packages", "-r", requirementsFile]);
}

function ensureWindowsOfflineSpeech(python) {
  if (!isWindows) return;

  if (!commandOk(python, ["-c", "import vosk"])) {
    console.warn("Vosk no esta instalado; preparando reconocimiento de voz local para JARVIS.");
    const install = tryRun(python, ["-m", "pip", "install", "vosk==0.3.45"]);
    if (install.status !== 0) {
      console.warn("No se pudo instalar Vosk. JARVIS usara otro proveedor de voz disponible.");
      return;
    }
  }

  const modelConfig = resolve(
    "backend",
    "models",
    "vosk-model-small-es-0.42",
    "conf",
    "model.conf",
  );
  if (existsSync(modelConfig)) return;

  console.warn("Modelo de voz espanol no encontrado; descargandolo una sola vez para JARVIS.");
  const installer = resolve("backend", "scripts", "install_vosk_model.ps1");
  const installModel = tryRun(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", installer],
  );
  if (installModel.status !== 0 || !existsSync(modelConfig)) {
    console.warn("No se pudo preparar el modelo offline. JARVIS usara otro proveedor de voz disponible.");
  }
}

const python = findPython();
const port = process.env.PORT || "8080";
const defaultDbDir = isWindows ? "." : "/tmp";

const env = {
  ...process.env,
  ENVIRONMENT: "demo",
  NORTHMINE_MODE: "demo",
  NORTHMINE_DATA_MODE: "DEMO",
  NORTHMINE_DEMO_MODE: "true",
  NORTHMINE_ALLOW_DEMO_LOGIN: "true",
  NORTHMINE_LOCAL_AUTO_SYNC_ENABLED: "false",
  NORTHMINE_AUDIT_DB: process.env.NORTHMINE_AUDIT_DB || `${defaultDbDir}/northmine_demo_audit.db`,
  NORTHMINE_USERS_DB: process.env.NORTHMINE_USERS_DB || `${defaultDbDir}/northmine_demo_users.db`,
  NORTHMINE_DEMO_ACCESS_DB: process.env.NORTHMINE_DEMO_ACCESS_DB || `${defaultDbDir}/northmine_demo_access.db`,
  NORTHMINE_DEMO_ACCESS_REQUIRE_DURABLE:
    process.env.NORTHMINE_DEMO_ACCESS_REQUIRE_DURABLE || (isWindows ? "false" : "true"),
};

ensureUvicorn(python);
ensureWindowsOfflineSpeech(python);

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
