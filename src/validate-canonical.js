'use strict';

const fs = require('fs');
const { validateCanonicalModel } = require('./canonical');

function validateFile(filePath) {
  const input = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return validateCanonicalModel(input);
}

if (require.main === module) {
  try {
    const file = process.argv[2];
    if (!file) throw new Error('usage: node src/validate-canonical.js <canonical.json>');
    console.log(JSON.stringify(validateFile(file), null, 2));
  } catch (error) {
    console.error('CANONICAL MODEL INVALID: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = { validateFile };
