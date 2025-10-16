import * as sdk from './packages/sdk/dist/index.js';
import fs from 'fs';

await sdk.initializeValidator();

const barbershopPath = 'D:/Projects_Clean/MOVA 3.4 AI-Powered Visual Workflow Editor/barbershop/global/01-complete-barbershop-crm-system.json';
const envelope = JSON.parse(fs.readFileSync(barbershopPath, 'utf-8'));

const result = sdk.ajvValidate(envelope);

console.log('Validation OK:', result.ok);
console.log('\nFirst 10 errors:');
result.errors?.slice(0, 10).forEach((e, i) => {
  console.log(`${i+1}. ${e.message}`);
  console.log(`   Path: ${e.instancePath}`);
  console.log(`   Keyword: ${e.keyword}\n`);
});
