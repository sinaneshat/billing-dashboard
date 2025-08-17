#!/usr/bin/env tsx
/* eslint-disable no-case-declarations */
/* eslint-disable ts/no-explicit-any */

/**
 * Workflow Orchestrator
 * Main entry point for executing complex workflows using SPARC methodology
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type WorkflowPhase = {
  name: string;
  parallel: boolean;
  steps: WorkflowStep[];
};

type WorkflowStep = {
  id: string;
  agent: string;
  command: string;
  description: string;
  dependencies?: string[];
  timeout?: number;
};

type WorkflowDefinition = {
  name: string;
  description: string;
  version: string;
  phases: WorkflowPhase[];
};

class WorkflowOrchestrator {
  private workflowDir: string;
  private outputDir: string;
  private memoryPrefix: string;
  private swarmId: string | null = null;

  constructor() {
    this.workflowDir = join(process.cwd(), 'workflows');
    this.outputDir = join(process.cwd(), 'outputs');
    this.memoryPrefix = `workflow_${Date.now()}`;

    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!existsSync(this.workflowDir)) {
      mkdirSync(this.workflowDir, { recursive: true });
    }
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private exec(command: string): string {
    console.log(`Executing: ${command}`);
    try {
      const output = execSync(command, { encoding: 'utf-8' });
      console.log(output);
      return output;
    } catch (error: any) {
      console.error(`Command failed: ${error.message}`);
      throw error;
    }
  }

  private async initializeSwarm(): Promise<void> {
    console.log('🚀 Initializing swarm...');
    const output = this.exec('npx claude-flow@alpha swarm init --topology mesh --max-agents 8 --json');
    const result = JSON.parse(output);
    this.swarmId = result.swarmId;

    this.storeMemory('swarm_init', `Swarm initialized with ID: ${this.swarmId}`);
  }

  private storeMemory(key: string, value: string): void {
    const fullKey = `${this.memoryPrefix}_${key}`;
    this.exec(`npx claude-flow@alpha memory store "${fullKey}" "${value}"`);
  }

  private retrieveMemory(key: string): string {
    const fullKey = `${this.memoryPrefix}_${key}`;
    return this.exec(`npx claude-flow@alpha memory retrieve "${fullKey}"`);
  }

  private async executeStep(step: WorkflowStep): Promise<void> {
    console.log(`\n📋 Executing step: ${step.id}`);
    console.log(`   Agent: ${step.agent}`);
    console.log(`   Description: ${step.description}`);

    const startTime = Date.now();

    try {
      // Check dependencies
      if (step.dependencies && step.dependencies.length > 0) {
        console.log(`   Checking dependencies: ${step.dependencies.join(', ')}`);
        for (const dep of step.dependencies) {
          const status = this.retrieveMemory(`step_${dep}_status`);
          if (!status.includes('completed')) {
            throw new Error(`Dependency ${dep} not completed`);
          }
        }
      }

      // Execute command
      const output = this.exec(step.command);

      // Store results
      const duration = Date.now() - startTime;
      this.storeMemory(`step_${step.id}_output`, output);
      this.storeMemory(`step_${step.id}_status`, 'completed');
      this.storeMemory(`step_${step.id}_duration`, `${duration}ms`);

      console.log(`   ✅ Step completed in ${duration}ms`);
    } catch (error: any) {
      this.storeMemory(`step_${step.id}_status`, 'failed');
      this.storeMemory(`step_${step.id}_error`, error.message);
      console.error(`   ❌ Step failed: ${error.message}`);
      throw error;
    }
  }

  private async executePhase(phase: WorkflowPhase): Promise<void> {
    console.log(`\n🎯 Executing phase: ${phase.name}`);
    console.log(`   Parallel: ${phase.parallel}`);
    console.log(`   Steps: ${phase.steps.length}`);

    if (phase.parallel) {
      // Execute steps in parallel
      const promises = phase.steps.map(step => this.executeStep(step));
      await Promise.all(promises);
    } else {
      // Execute steps sequentially
      for (const step of phase.steps) {
        await this.executeStep(step);
      }
    }

    this.storeMemory(`phase_${phase.name}_status`, 'completed');
    console.log(`   ✅ Phase ${phase.name} completed`);
  }

  public async executeWorkflow(workflowName: string): Promise<void> {
    console.log(`\n🔄 Starting workflow: ${workflowName}`);

    // Load workflow definition
    const workflowPath = join(this.workflowDir, `${workflowName}.workflow.json`);
    if (!existsSync(workflowPath)) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }

    const workflow: WorkflowDefinition = JSON.parse(
      readFileSync(workflowPath, 'utf-8'),
    );

    console.log(`📖 Loaded workflow: ${workflow.name} v${workflow.version}`);
    console.log(`   Description: ${workflow.description}`);
    console.log(`   Phases: ${workflow.phases.length}`);

    try {
      // Initialize swarm
      await this.initializeSwarm();

      // Execute phases
      for (const phase of workflow.phases) {
        await this.executePhase(phase);
      }

      // Generate report
      this.generateReport(workflow);

      console.log('\n✅ Workflow completed successfully!');
    } catch (error: any) {
      console.error(`\n❌ Workflow failed: ${error.message}`);
      throw error;
    } finally {
      // Cleanup
      if (this.swarmId) {
        console.log('\n🧹 Cleaning up swarm...');
        this.exec(`npx claude-flow@alpha swarm destroy --swarm-id ${this.swarmId}`);
      }
    }
  }

  private generateReport(workflow: WorkflowDefinition): void {
    console.log('\n📊 Generating workflow report...');

    const report = {
      workflow: workflow.name,
      version: workflow.version,
      timestamp: new Date().toISOString(),
      phases: workflow.phases.map(phase => ({
        name: phase.name,
        status: this.retrieveMemory(`phase_${phase.name}_status`),
        steps: phase.steps.map(step => ({
          id: step.id,
          status: this.retrieveMemory(`step_${step.id}_status`),
          duration: this.retrieveMemory(`step_${step.id}_duration`),
        })),
      })),
    };

    const reportPath = join(this.outputDir, `workflow-report-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`   Report saved to: ${reportPath}`);
  }

  public async runBatchWorkflow(tasks: string[]): Promise<void> {
    console.log('\n🚀 Running batch workflow with BatchTool');

    const batchCommand = `
      batchtool orchestrate --boomerang --name "batch-workflow" \\
        --phase1-parallel \\
          ${tasks.map(task => `"npx claude-flow sparc run ${task} --non-interactive"`).join(' \\\n          ')} \\
        --monitor
    `;

    this.exec(batchCommand);
  }
}

// CLI Interface
async function main() {
  const orchestrator = new WorkflowOrchestrator();

  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'execute':
      const workflowName = args[1] || 'feature-development';
      await orchestrator.executeWorkflow(workflowName);
      break;

    case 'batch':
      const tasks = args.slice(1);
      if (tasks.length === 0) {
        console.error('No tasks specified for batch execution');
        process.exit(1);
      }
      await orchestrator.runBatchWorkflow(tasks);
      break;

    case 'list':
      const workflows = execSync('ls workflows/*.workflow.json', { encoding: 'utf-8' });
      console.log('Available workflows:');
      console.log(workflows);
      break;

    default:
      console.log(`
Workflow Orchestrator

Usage:
  tsx workflows/orchestrate.ts <command> [options]

Commands:
  execute <workflow>  Execute a workflow by name
  batch <tasks...>    Run multiple tasks in batch
  list               List available workflows

Examples:
  tsx workflows/orchestrate.ts execute feature-development
  tsx workflows/orchestrate.ts batch "spec-pseudocode 'auth system'" "architect 'design auth'" "code 'implement auth'"
  tsx workflows/orchestrate.ts list
      `);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { WorkflowOrchestrator };
