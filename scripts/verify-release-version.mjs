import { readFileSync } from "node:fs";

const releaseTag = process.argv[2];
if (!releaseTag) {
  process.stderr.write("Missing release tag.\n");
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const tagVersion = releaseTag.startsWith("v")
  ? releaseTag.slice(1)
  : releaseTag;

if (
  tagVersion !== packageJson.version ||
  tagVersion !== manifest.version
) {
  process.stderr.write(
    [
      "Release version mismatch:",
      `- Tag: ${releaseTag} (version ${tagVersion})`,
      `- package.json: ${packageJson.version}`,
      `- manifest.json: ${manifest.version}`,
      "",
    ].join("\n"),
  );
  process.exit(1);
}

process.stdout.write(`Release versions match: ${tagVersion}\n`);
