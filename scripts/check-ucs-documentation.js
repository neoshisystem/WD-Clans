#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();

const requiredFiles = [
  'AGENTS.md',
  'docs/UCS_AGENT_OPERATIONS.md',
  'docs/UCS_DOCUMENTATION_CONTROL_V0_1.md',
  'docs/UCS_REAL_SNAPSHOT_INGESTION_STANDARD_V0_1.md',
  'docs/UCS_SCHEMA_FILE_MAP_V0_1.md',
  'package.json',
  '.github/workflows/ci.yml',
];

function fail(message) {
  console.error(`FAIL | UCS documentation | ${message}`);
  process.exit(1);
}

function requireFile(relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    fail(`required file missing: ${relativePath}`);
  }
}

function requireText(relativePath, literal) {
  const absolute = path.join(root, relativePath);
  const content = fs.readFileSync(absolute, 'utf8');
  if (!content.includes(literal)) {
    fail(`${relativePath} does not contain required contract text: ${literal}`);
  }
}

for (const file of requiredFiles) {
  requireFile(file);
}

requireText(
  'AGENTS.md',
  'docs/UCS_DOCUMENTATION_CONTROL_V0_1.md'
);
requireText(
  'AGENTS.md',
  'checkpoint'
);
requireText(
  'docs/UCS_AGENT_OPERATIONS.md',
  'Documentation checkpoint'
);
requireText(
  'docs/UCS_AGENT_OPERATIONS.md',
  'projects/UCS/DOCUMENTATION_CONTROL.md'
);
requireText(
  'docs/UCS_DOCUMENTATION_CONTROL_V0_1.md',
  '**Status:** APPROVED PROJECT GOVERNANCE'
);
requireText(
  'docs/UCS_DOCUMENTATION_CONTROL_V0_1.md',
  'No documentation drift'
);
requireText(
  'package.json',
  '"check:documentation": "node scripts/check-ucs-documentation.js"'
);
requireText(
  '.github/workflows/ci.yml',
  'npm run check:documentation'
);

console.log('PASS | UCS documentation | required control files and CI wiring are present');
