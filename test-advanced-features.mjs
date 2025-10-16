import * as sdk from './packages/sdk/dist/index.js';

const testEnvelope = {
  "envelope": "3.4.1",
  "metadata": {
    "id": "test-workflow",
    "version": "1.0.0"
  },
  "plan": {
    "steps": [
      {
        "noun": "item",
        "verb": "http_fetch",
        "data": {
          "url": "https://example.com/api"
        }
      },
      {
        "noun": "item",
        "verb": "transform",
        "data": {
          "template": "{{item}}"
        }
      }
    ]
  }
};

const testText = JSON.stringify(testEnvelope, null, 2);

console.log('🧪 Advanced Features Test Suite\n');
console.log('=====================================\n');

// Test 1: Execute Plan Dry-run
console.log('⚡ Test 1: Execute Plan Dry-run');
try {
  const result = await sdk.executePlanDryRun(testText);
  if (result.success) {
    console.log('  ✅ PASS: Plan executed successfully');
    console.log(`     Steps executed: ${result.steps.length}`);
    console.log(`     Total duration: ${result.totalDuration}ms`);
    result.steps.forEach((step, i) => {
      console.log(`     Step ${i}: ${step.verb}/${step.noun} - ${step.status}`);
    });
  } else {
    console.log('  ❌ FAIL: Plan execution failed');
    console.log(`     Errors: ${result.errors.join(', ')}`);
  }
} catch (err) {
  console.log(`  ❌ FAIL: ${String(err)}`);
}

// Test 2: Semantic Analysis
console.log('\n📊 Test 2: Semantic Analysis');
try {
  const result = sdk.performSemanticAnalysis(testText);
  if (result.valid) {
    console.log('  ✅ PASS: Semantic analysis passed');
    if (result.warnings.length > 0) {
      console.log(`     Warnings: ${result.warnings.length}`);
      result.warnings.slice(0, 2).forEach(w => {
        console.log(`       - ${w.message}`);
      });
    }
  } else {
    console.log('  ❌ FAIL: Semantic errors found');
    result.errors.forEach(err => {
      console.log(`       - ${err.path}: ${err.message}`);
    });
  }
} catch (err) {
  console.log(`  ❌ FAIL: ${String(err)}`);
}

// Test 3: Semantic Analysis - Invalid envelope
console.log('\n📊 Test 3: Semantic Analysis - Error Detection');
const invalidEnvelope = {
  "envelope": "3.4.1",
  "plan": {
    "steps": [
      {
        "noun": "item",
        "verb": "unknown_verb"
      }
    ]
  }
};

try {
  const result = sdk.performSemanticAnalysis(JSON.stringify(invalidEnvelope, null, 2));
  if (!result.valid) {
    console.log('  ✅ PASS: Semantic errors detected');
    console.log(`     Found ${result.errors.length} errors:`);
    result.errors.forEach(err => {
      console.log(`       - ${err.type}: ${err.message}`);
      if (err.suggestion) console.log(`         Suggestion: ${err.suggestion}`);
    });
  } else {
    console.log('  ❌ FAIL: Should have found errors');
  }
} catch (err) {
  console.log(`  ❌ FAIL: ${String(err)}`);
}

// Test 4: Quickfix Suggestions
console.log('\n🔧 Test 4: Quickfix Suggestions');
try {
  const quickfixes = sdk.generateQuickfixes(
    testText,
    'plan.steps[0].verb',
    'Invalid verb'
  );
  
  if (quickfixes.length > 0) {
    console.log('  ✅ PASS: Quickfixes generated');
    console.log(`     Found ${quickfixes.length} suggestions`);
    quickfixes.slice(0, 3).forEach((qf, i) => {
      console.log(`     ${i + 1}. ${qf.title}`);
    });
  } else {
    console.log('  ℹ️  INFO: No quickfixes for this error');
  }
} catch (err) {
  console.log(`  ❌ FAIL: ${String(err)}`);
}

// Test 5: Quickfix Templates
console.log('\n🎨 Test 5: Quickfix Templates');
try {
  const templates = {
    'idempotency': sdk.generateIdempotencyKeyTemplate(),
    'http_fetch': sdk.generateHttpFetchTemplate(),
    'validation': sdk.generateValidationTemplate(),
    'transform': sdk.generateTransformTemplate()
  };
  
  console.log('  ✅ PASS: Templates generated');
  Object.entries(templates).forEach(([name, template]) => {
    const lines = template.split('\n').length;
    console.log(`     ${name}: ${lines} lines`);
  });
} catch (err) {
  console.log(`  ❌ FAIL: ${String(err)}`);
}

// Test 6: Semantic Suggestions
console.log('\n💡 Test 6: Semantic Suggestions');
try {
  const suggestions = sdk.getSemanticSuggestions(testText, 'plan.steps[0].verb');
  if (suggestions.length > 0) {
    console.log('  ✅ PASS: Suggestions provided');
    suggestions.forEach(s => {
      console.log(`     - ${s}`);
    });
  } else {
    console.log('  ℹ️  INFO: No suggestions available');
  }
} catch (err) {
  console.log(`  ❌ FAIL: ${String(err)}`);
}

console.log('\n=====================================');
console.log('✨ Advanced features tests complete!\n');
