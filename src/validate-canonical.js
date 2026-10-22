'use strict';

const fs = require('fs');
const path = require('path');
const { validateCanonicalModel } = require('./canonical');

function validateFile(filePath) {
  const resolved = path.resolve(filePath);
  const input = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  return validateCanonicalModel(input);
}

if (require.main === module) {
  try {
    const file = process.argv[2] || path.join(__dirname, '..', 'data', 'canonical.json');
    console.log(JSON.stringify(validateFile(file), null, 2));
  } catch (error) {
    console.error('CANONICAL MODEL INVALID: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = { validateFile };
