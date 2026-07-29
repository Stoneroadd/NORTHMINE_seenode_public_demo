import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const isWindows = process.platform === "win32";

function commandName(command) {
  if (isWindows && command === "npm") return "npm.cmd";
  return command;
}

function run(command, args, options = {}) {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(commandName(command), args, {
    stdio: "inherit",
    shell: isWindows && command === "npm",
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
    shell: isWindows && command === "npm",
    ...options,
  });
}

function findPython() {
  const candidates = isWindows ? ["python.exe", "python", "py"] : ["python3", "python"];
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], {
      stdio: "ignore",
    });
    if (result.status === 0) return candidate;
  }
  console.error("No se encontro Python. Seenode debe tener Python disponible para arrancar FastAPI.");
  process.exit(1);
}

function venvPythonPath() {
  return isWindows
    ? resolve(".venv", "Scripts", "python.exe")
    : resolve(".venv", "bin", "python");
}

function installAptPythonTooling() {
  if (isWindows) return false;
  if (tryRun("apt-get", ["--version"]).status !== 0) return false;
  if (tryRun("apt-get", ["update"]).status !== 0) return false;
  return tryRun("apt-get", ["install", "-y", "python3-pip", "python3-venv"]).status === 0;
}

function installBackendRequirements(systemPython) {
  const requirementsFile = process.env.NORTHMINE_REQUIREMENTS_FILE || "backend/requirements.seenode.txt";
  const createVenv = tryRun(systemPython, ["-m", "venv", ".venv"]);
  const venvPython = venvPythonPath();
  if (createVenv.status === 0 && existsSync(venvPython)) {
    run(venvPython, ["-m", "pip", "install", "-r", requirementsFile]);
    return;
  }

  console.warn("No se pudo crear .venv; instalando requirements con pip del sistema.");
  const pipCheck = tryRun(systemPython, ["-m", "pip", "--version"]);
  if (pipCheck.status !== 0) {
    const ensurePip = tryRun(systemPython, ["-m", "ensurepip", "--upgrade"]);
    if (ensurePip.status !== 0 && !installAptPythonTooling()) {
      console.error("No se pudo instalar pip para Python en la imagen de build.");
      process.exit(1);
    }
  }

  const pipInstall = tryRun(systemPython, ["-m", "pip", "install", "-r", requirementsFile]);
  if (pipInstall.status === 0) return;

  run(systemPython, ["-m", "pip", "install", "--break-system-packages", "-r", requirementsFile]);
}

const python = findPython();

run("npm", ["--prefix", "frontend", "ci", "--legacy-peer-deps"]);
run("npm", ["--prefix", "frontend", "run", "build"], {
  env: {
    ...process.env,
    VITE_ENVIRONMENT: process.env.VITE_ENVIRONMENT || "production",
    VITE_SHOW_DEMO_MODE: process.env.VITE_SHOW_DEMO_MODE || "true",
    VITE_DEMO_LITE: process.env.VITE_DEMO_LITE || "true",
  },
});
installBackendRequirements(python);
