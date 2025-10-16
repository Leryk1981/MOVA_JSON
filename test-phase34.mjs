import * as sdk from './packages/sdk/dist/index.js';
import fs from 'fs';
import path from 'path';

console.log('╔════════════════════════════════════════╗');
console.log('║  PHASE 3&4: BARBERSHOP CRM VALIDATION ║');
console.log('╚════════════════════════════════════════╝\n');

await sdk.initializeValidator();
console.log('✓ AJV 8.17.1 + ajv-formats initialized\n');

const barbershopPath = 'D:/Projects_Clean/MOVA 3.4 AI-Powered Visual Workflow Editor/barbershop/global/01-complete-barbershop-crm-system.json';

try {
  // Test 1: Load Barbershop envelope
  console.log('Test 1 - Load Barbershop CRM envelope...');
  const envelope = JSON.parse(fs.readFileSync(barbershopPath, 'utf-8'));
  console.log('  ✅ PASS - File loaded successfully');
  console.log(`    • Envelope ID: ${envelope.envelope_id}`);
  console.log(`    • Category: ${envelope.category}`);
  console.log(`    • MOVA Version: ${envelope.mova_version}\n`);

  // Test 2: Validate structure
  console.log('Test 2 - Validate Barbershop envelope structure...');
  const result = sdk.ajvValidate(envelope);
  if (result.ok) {
    console.log('  ✅ PASS - Envelope structure is valid\n');
  } else {
    console.log('  ❌ FAIL - Validation errors:');
    result.errors?.slice(0, 3).forEach(e => {
      console.log(`    • ${e.message}`);
    });
    console.log();
  }

  // Test 3: Check Global Catalogs
  console.log('Test 3 - Check Global Catalogs...');
  if (envelope.globalCatalogs) {
    const cats = envelope.globalCatalogs;
    console.log('  ✅ PASS - Global Catalogs present');
    console.log(`    • Roles: ${cats.roles?.length || 0}`);
    console.log(`    • Resources: ${cats.resources?.length || 0}`);
    console.log(`    • Data Schemas: ${cats.dataSchemas?.length || 0}`);
    console.log(`    • States: ${cats.states?.length || 0}`);
    console.log(`    • Rules: ${cats.rules?.length || 0}\n`);
  } else {
    console.log('  ⚠️  SKIP - No Global Catalogs found\n');
  }

  // Test 4: Check plan steps
  console.log('Test 4 - Check workflow plan...');
  if (envelope.plan?.steps) {
    console.log(`  ✅ PASS - Plan has ${envelope.plan.steps.length} steps`);
    const verbs = new Set(envelope.plan.steps.map(s => s.verb));
    console.log(`    • Unique verbs: ${Array.from(verbs).join(', ')}\n`);
  } else {
    console.log('  ⚠️  SKIP - No plan steps found\n');
  }

  console.log('✅ PHASE 3&4 COMPLETE\n');
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
