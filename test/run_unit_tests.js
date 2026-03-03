const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const unitTestDir = path.resolve(__dirname, 'unit');
const files = fs.readdirSync(unitTestDir).filter(f => f.endsWith('.test.js'));

console.log(`=== Running ${files.length} Unit Test Files ===\n`);

let passed = 0;
let failed = 0;

files.forEach(file => {
  const filePath = path.join(unitTestDir, file);
  try {
    const output = execSync(`node ${filePath}`, { encoding: 'utf8' });
    console.log(output.trim());
    passed++;
  } catch (err) {
    console.error(`✗ Error in ${file}:`);
    console.error(err.stdout || err.message);
    failed++;
  }
});

console.log('\n=== Unit Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
