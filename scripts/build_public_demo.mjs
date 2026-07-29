import { spawnSync } from "node:child_process";

function run(command, args, options = {}) {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function findPython() {
  for (const candidate of ["python", "python3"]) {
    const result = spawnSync(candidate, ["--version"], {
      stdio: "ignore",
      shell: process.platform === "win32",
    });
    if (result.status === 0) return candidate;
  }
  console.error("No se encontro Python. Seenode debe tener Python disponible para arrancar FastAPI.");
  process.exit(1);
}

const python = findPython();

run("npm", ["--prefix", "frontend", "ci", "--legacy-peer-deps"]);
run("npm", ["--prefix", "frontend", "run", "build"], {
  env: {
    ...process.env,
    VITE_ENVIRONMENT: process.env.VITE_ENVIRONMENT || "production",
  },
});
run(python, ["-m", "pip", "install", "-r", "backend/requirements.txt"]);
