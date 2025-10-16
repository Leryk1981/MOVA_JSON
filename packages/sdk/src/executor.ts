export interface ExecutorConfig {
  timeout?: number;
  maxDepth?: number;
  variables?: Record<string, any>;
}

export interface ExecutorResult {
  success: boolean;
  steps: Array<{
    index: number;
    verb: string;
    noun: string;
    status: 'success' | 'error' | 'skipped';
    output?: any;
    error?: string;
    duration: number;
  }>;
  totalDuration: number;
  errors: string[];
}

/**
 * Execute a MOVA plan in dry-run mode (no side effects)
 */
export async function executePlanDryRun(
  envelopeText: string,
  config: ExecutorConfig = {}
): Promise<ExecutorResult> {
  const startTime = Date.now();
  const result: ExecutorResult = {
    success: true,
    steps: [],
    totalDuration: 0,
    errors: []
  };

  try {
    const envelope = JSON.parse(envelopeText);

    if (!envelope.plan?.steps || !Array.isArray(envelope.plan.steps)) {
      result.success = false;
      result.errors.push('No plan.steps found in envelope');
      result.totalDuration = Date.now() - startTime;
      return result;
    }

    const steps = envelope.plan.steps;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepStart = Date.now();

      try {
        // Validate step structure
        if (!step.verb || !step.noun) {
          result.steps.push({
            index: i,
            verb: step.verb || 'unknown',
            noun: step.noun || 'unknown',
            status: 'error',
            error: 'Missing verb or noun',
            duration: Date.now() - stepStart
          });
          result.errors.push(`Step ${i}: Missing verb or noun`);
          result.success = false;
          continue;
        }

        // Simulate step execution
        const output = await simulateStepExecution(step, config.variables || {});
        result.steps.push({
          index: i,
          verb: step.verb,
          noun: step.noun,
          status: 'success',
          output,
          duration: Date.now() - stepStart
        });
      } catch (err) {
        result.steps.push({
          index: i,
          verb: step.verb || 'unknown',
          noun: step.noun || 'unknown',
          status: 'error',
          error: String(err),
          duration: Date.now() - stepStart
        });
        result.errors.push(`Step ${i}: ${String(err)}`);
        result.success = false;
      }
    }

    result.totalDuration = Date.now() - startTime;
    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to parse envelope: ${String(error)}`);
    result.totalDuration = Date.now() - startTime;
    return result;
  }
}

/**
 * Simulate step execution (dry-run - no actual side effects)
 */
async function simulateStepExecution(step: any, variables: Record<string, any>): Promise<any> {
  // Simple simulation without setTimeout
  const output = {
    verb: step.verb,
    noun: step.noun,
    executedAt: new Date().toISOString(),
    data: step.data || {},
    variables: variables
  };
  return output;
}

/**
 * Validate plan structure before execution
 */
export function validatePlanStructure(envelopeText: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const envelope = JSON.parse(envelopeText);

    if (!envelope.plan) {
      errors.push('Missing plan object');
      return { valid: false, errors };
    }

    if (!Array.isArray(envelope.plan.steps)) {
      errors.push('plan.steps must be an array');
      return { valid: false, errors };
    }

    if (envelope.plan.steps.length === 0) {
      errors.push('plan.steps is empty');
      return { valid: false, errors };
    }

    // Validate each step
    envelope.plan.steps.forEach((step: any, index: number) => {
      if (!step.verb) {
        errors.push(`Step ${index}: missing verb`);
      }
      if (!step.noun) {
        errors.push(`Step ${index}: missing noun`);
      }
    });

    return { valid: errors.length === 0, errors };
  } catch (error) {
    errors.push(`Invalid JSON: ${String(error)}`);
    return { valid: false, errors };
  }
}
