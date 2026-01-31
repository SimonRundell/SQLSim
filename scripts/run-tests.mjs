import { runTests } from '../src/tests.js';

const { passed, failed, total } = runTests();

if (failed > 0) {
  console.error(`\n❌ Test run failed: ${failed}/${total} failing`);
  process.exit(1);
}

console.log(`\n✅ All ${passed}/${total} tests passed`);
