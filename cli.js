/**
 * 🐺 ClawChain CLI - Wallet & Interaction Tool
 */

import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_URL = 'http://localhost:3000';

class ClawChainCLI {
  constructor() {
    this.walletFile = path.join(__dirname, '.wallet');
    this.wallet = this.loadWallet();
  }

  loadWallet() {
    if (fs.existsSync(this.walletFile)) {
      return JSON.parse(fs.readFileSync(this.walletFile, 'utf-8'));
    }
    return null;
  }

  saveWallet() {
    fs.writeFileSync(this.walletFile, JSON.stringify(this.wallet, null, 2));
    console.log('💾 Wallet saved!');
  }

  async createWallet() {
    console.log('\n🐺 Create your ClawChain Agent Wallet\n');
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Agent name:',
        validate: (input) => input.length >= 2 || 'Name too short'
      },
      {
        type: 'checkbox',
        name: 'capabilities',
        message: 'Agent capabilities:',
        choices: [
          'coding', 'analysis', 'trading', 'governance', 'recruitment',
          'validation', 'oracle', 'arbitration', 'storage', 'communication'
        ]
      }
    ]);

    this.wallet = {
      agentId: null, // Will be assigned by chain
      name: answers.name,
      capabilities: answers.capabilities,
      createdAt: Date.now()
    };

    this.saveWallet();
    console.log(`\n✅ Wallet created: ${this.wallet.name}`);
    console.log('📝 Registering with ClawChain...');
    
    await this.registerAgent();
  }

  async registerAgent() {
    try {
      const response = await fetch(`${API_URL}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.wallet.name,
          capabilities: this.wallet.capabilities
        })
      });
      
      const data = await response.json();
      if (data.success) {
        this.wallet.agentId = data.agent.id;
        this.saveWallet();
        console.log(`🐺 Agent registered! ID: ${this.wallet.agentId}`);
        console.log(`💰 Starting credits: ${data.agent.credits}`);
        console.log(`⭐ Starting reputation: ${data.agent.reputation}`);
      }
    } catch (e) {
      console.error('Registration failed:', e.message);
      console.log('Make sure ClawChain is running (npm start)');
    }
  }

  async createTask() {
    if (!this.wallet?.agentId) {
      console.log('❌ No agent registered. Run "npm run wallet" first.');
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Task title:'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Task description:'
      },
      {
        type: 'number',
        name: 'credits',
        message: 'Credits to offer (you need this many credits):',
        validate: (input) => input > 0 || 'Must be > 0'
      },
      {
        type: 'checkbox',
        name: 'capabilities',
        message: 'Required capabilities:',
        choices: ['coding', 'analysis', 'trading', 'governance', 'recruitment', 'validation', 'oracle', 'arbitration']
      }
    ]);

    try {
      const response = await fetch(`${API_URL}/api/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAgentId: this.wallet.agentId,
          ...answers
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log(`✅ Task created! ID: ${data.task.id}`);
      }
    } catch (e) {
      console.error('Failed:', e.message);
    }
  }

  async listTasks() {
    try {
      const response = await fetch(`${API_URL}/api/tasks`);
      const tasks = await response.json();
      
      console.log('\n📋 OPEN TASKS\n');
      const openTasks = tasks.filter(t => t.status === 'open');
      
      if (openTasks.length === 0) {
        console.log('No open tasks. Create one!');
      } else {
        openTasks.forEach(task => {
          console.log(`  [${task.id.substring(0, 6)}] ${task.title}`);
          console.log(`     Credits: ${task.credits} | Capabilites: ${task.requiredCapabilities?.join(', ')}`);
          console.log('');
        });
      }
    } catch (e) {
      console.error('Failed to fetch tasks:', e.message);
    }
  }

  async acceptTask() {
    if (!this.wallet?.agentId) {
      console.log('❌ No agent registered');
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'taskId',
        message: 'Task ID to accept:'
      }
    ]);

    try {
      const response = await fetch(`${API_URL}/api/task/${answers.taskId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: this.wallet.agentId })
      });

      const data = await response.json();
      if (data.success) {
        console.log(`✅ Task accepted! You are now working on: ${data.task.title}`);
      }
    } catch (e) {
      console.error('Failed:', e.message);
    }
  }

  async completeTask() {
    if (!this.wallet?.agentId) {
      console.log('❌ No agent registered');
      return;
    }

    const answers = await inquirer.prompt([
      { type: 'input', name: 'taskId', message: 'Task ID to complete:' },
      { type: 'input', name: 'proof', message: 'Proof of work (description):' }
    ]);

    try {
      const response = await fetch(`${API_URL}/api/task/${answers.taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: this.wallet.agentId, proof: answers.proof })
      });

      const data = await response.json();
      if (data.success) {
        console.log('✅ Task completed! Credits transferred.');
      }
    } catch (e) {
      console.error('Failed:', e.message);
    }
  }

  async showStatus() {
    if (!this.wallet?.agentId) {
      console.log('❌ No agent registered');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/agent/${this.wallet.agentId}`);
      const agent = await response.json();

      console.log('\n🐺 YOUR AGENT STATUS\n');
      console.log(`  Name:        ${agent.name}`);
      console.log(`  ID:          ${agent.id}`);
      console.log(`  Reputation:  ${agent.reputation} ⭐`);
      console.log(`  Credits:     ${agent.credits} 💰`);
      console.log(`  Tasks Done:  ${agent.tasksCompleted} ✅`);
      console.log(`  Capabilities: ${agent.capabilities?.join(', ')}`);
      console.log('');
    } catch (e) {
      console.error('Failed:', e.message);
    }
  }

  async showNetworkStats() {
    try {
      const response = await fetch(`${API_URL}/api/stats`);
      const stats = await response.json();

      console.log('\n🌐 CLAWCHAIN NETWORK STATS\n');
      console.log(`  Blocks:          ${stats.blocks}`);
      console.log(`  Agents:          ${stats.agents}`);
      console.log(`  Open Tasks:      ${stats.openTasks}`);
      console.log(`  Total Reputation: ${stats.totalReputation} ⭐`);
      console.log(`  Total Credits:    ${stats.totalCredits} 💰`);
      console.log('');
    } catch (e) {
      console.error('Failed:', e.message);
    }
  }

  async showMenu() {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '🐺 What do you want to do?',
        choices: [
          'Show my status',
          'Show network stats',
          'Create a task',
          'List open tasks',
          'Accept a task',
          'Complete a task',
          'Exit'
        ]
      }
    ]);

    switch (answers.action) {
      case 'Show my status': await this.showStatus(); break;
      case 'Show network stats': await this.showNetworkStats(); break;
      case 'Create a task': await this.createTask(); break;
      case 'List open tasks': await this.listTasks(); break;
      case 'Accept a task': await this.acceptTask(); break;
      case 'Complete a task': await this.completeTask(); break;
      case 'Exit': process.exit(0);
    }

    if (answers.action !== 'Exit') {
      await this.showMenu();
    }
  }

  async start() {
    if (!this.wallet) {
      console.log('\n🐺 Welcome to ClawChain CLI!\n');
      console.log('You need a wallet to interact with the agent blockchain.');
      const create = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'create',
          message: 'Create a new agent wallet?'
        }
      ]);

      if (create.create) {
        await this.createWallet();
      } else {
        console.log('Run "npm run wallet" when ready!');
        process.exit(0);
      }
    }

    await this.showMenu();
  }
}

const cli = new ClawChainCLI();
cli.start();
