import('./packages/sdk/dist/index.js').then(async (sdk) => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     PHASE 1: SDK VALIDATION TEST      ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  await sdk.initializeValidator();
  console.log('✓ AJV 8.17.1 + ajv-formats initialized\n');
  
  // Test 1: Valid envelope
  const validData = {
    mova_version: '3.4.1',
    envelope_id: 'test-1',
    category: 'test',
    title: 'Test Envelope',
    summary: 'Test summary',
    plan: { 
      steps: [
        {
          id: 'step1',
          verb: 'log',
          with: { message: 'test' }
        }
      ] 
    }
  };
  
  const r1 = sdk.ajvValidate(validData);
  console.log('Test 1 - Valid envelope:', r1.ok ? '✅ PASS' : '❌ FAIL');
  if (!r1.ok && r1.errors) {
    console.log('  Errors:', r1.errors.slice(0, 2).map(e => e.message).join(', '));
  }
  
  // Test 2: Invalid version
  const invalidData = {
    mova_version: '3.3.0',
    envelope_id: 'test-2',
    category: 'test',
    title: 'Invalid',
    summary: 'Test'
  };
  
  const r2 = sdk.ajvValidate(invalidData);
  console.log('Test 2 - Invalid version:', !r2.ok ? '✅ PASS (rejected)' : '❌ FAIL');
  
  // Test 3: Document validation  
  const docResult = await sdk.validateDocument(JSON.stringify(validData));
  console.log('Test 3 - Document validation:', docResult.ok ? '✅ PASS' : '❌ FAIL');
  
  // Test 4: Completions
  const completions = sdk.suggestCompletions({ text: '{ "mova', position: { line: 0, character: 8 } });
  console.log('Test 4 - Suggestions:', Array.isArray(completions) && completions.length > 0 ? '✅ PASS' : '❌ FAIL');
  
  console.log('\n✅ PHASE 1 COMPLETE\n');
}).catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
