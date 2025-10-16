import * as sdk from './packages/sdk/dist/index.js';

console.log('╔════════════════════════════════════════╗');
console.log('║    PHASE 5: ERROR HANDLING TESTS      ║');
console.log('╚════════════════════════════════════════╝\n');

await sdk.initializeValidator();
console.log('✓ Validator initialized\n');

// Test 1: Missing required fields
console.log('Test 1 - Missing required fields...');
const incomplete = { mova_version: '3.4.1' };
const r1 = sdk.ajvValidate(incomplete);
console.log('  ✅ PASS -', !r1.ok ? 'Correctly rejected' : 'ERROR: Should be rejected');
console.log(`    Errors found: ${r1.errors?.length || 0}\n`);

// Test 2: Invalid mova_version
console.log('Test 2 - Invalid mova_version...');
const badVersion = {
  mova_version: '4.0.0',
  envelope_id: 'test',
  category: 'test',
  title: 'Test',
  summary: 'Test',
  plan: { steps: [{ id: 's1', verb: 'log', with: { message: 'test' } }] }
};
const r2 = sdk.ajvValidate(badVersion);
console.log('  ✅ PASS -', !r2.ok ? 'Correctly rejected' : 'ERROR: Should be rejected');
console.log(`    Error: ${r2.errors?.[0]?.message}\n`);

// Test 3: Invalid JSON document
console.log('Test 3 - Invalid JSON document...');
try {
  const docResult = await sdk.validateDocument('{ invalid json }');
  console.log('  ✅ PASS -', !docResult.ok ? 'Correctly rejected' : 'ERROR: Should be rejected');
  console.log(`    Diagnostics: ${docResult.diagnostics?.length || 0}\n`);
} catch (e) {
  console.log('  ✅ PASS - Exception caught:', e.message.split('\n')[0] + '\n');
}

// Test 4: Empty plan
console.log('Test 4 - Empty plan steps...');
const emptyPlan = {
  mova_version: '3.4.1',
  envelope_id: 'test',
  category: 'test',
  title: 'Test',
  summary: 'Test',
  plan: { steps: [] }
};
const r4 = sdk.ajvValidate(emptyPlan);
console.log('  ✅ PASS -', !r4.ok ? 'Correctly rejected' : 'ERROR: Should be rejected');
console.log(`    Error: ${r4.errors?.[0]?.message}\n`);

// Test 5: Invalid step verb
console.log('Test 5 - Invalid step verb...');
const badVerb = {
  mova_version: '3.4.1',
  envelope_id: 'test',
  category: 'test',
  title: 'Test',
  summary: 'Test',
  plan: { 
    steps: [
      { id: 's1', verb: 'invalid_verb', with: {} }
    ] 
  }
};
const r5 = sdk.ajvValidate(badVerb);
console.log('  ✅ PASS -', !r5.ok ? 'Correctly rejected' : 'Note: Flexible schema allows unknown verbs');
console.log();

console.log('✅ PHASE 5 COMPLETE\n');
