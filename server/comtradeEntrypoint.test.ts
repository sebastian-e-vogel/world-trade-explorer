import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { expect, it } from "vitest";

it("boots the emitted API entry point in Node ESM without a bundler", () => {
  const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const output = mkdtempSync(join(tmpdir(), "comtrade-entrypoint-"));
  try {
    const program = ts.createProgram([join(project, "api/comtrade.ts")], {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      resolveJsonModule: true,
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
      types: ["node"],
      rootDir: project,
      outDir: output,
      noEmitOnError: true,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    expect(diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n"))).toEqual([]);
    expect(program.emit().emitSkipped).toBe(false);
    writeFileSync(join(output, "package.json"), JSON.stringify({ type: "module" }));
    const entrypoint = pathToFileURL(join(output, "api/comtrade.js")).href;
    const result = execFileSync(process.execPath, [
      "--input-type=module", "-e",
      `const module = await import(${JSON.stringify(entrypoint)}); console.log(typeof module.default);`,
    ], { encoding: "utf8", timeout: 5000 });
    expect(result.trim()).toBe("function");
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}, 15000);
