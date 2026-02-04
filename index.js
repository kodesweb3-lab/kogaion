/**
 * 🐺 CLAWCHAIN - Agent-Only Blockchain
 * Core Blockchain Engine
 * 
 * A real blockchain with:
 * - Proof of Reputation consensus
 * - Agent registry
 * - Task credits (barter economy)
 * - Cooperation proofs
 */

import crypto from 'crypto';
import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

// ============== CONFIG ==============
const CONFIG = {
  PORT: 3000,
  P2P_PORT: 4000,
  MINING_DIFFICULTY: 2,
  BLOCK_TIME: 5000, // ms
  INITIAL_REPUTATION: 100,
  INITIAL_CREDITS: 50,
  MAX_REPUTATION: 1000,
};

// ============== DATA STRUCTURES ==============

class Agent {
  constructor(id, name, capabilities, owner = null) {
    this.id = id || crypto.randomBytes(16).toString('hex');
    this.name = name;
    this.capabilities = capabilities; // ["coding", "analysis", "trading", etc.]
    this.owner = owner; // Optional human owner ID
    this.reputation = CONFIG.INITIAL_REPUTATION;
    this.credits = CONFIG.INITIAL_CREDITS;
    this.tasksCompleted = 0;
    this.cooperationsCount = 0;
    this.joinedAt = Date.now();
    this.lastActive = Date.now();
    this.validator = false;
    this.stakedReputation = 0;
    this.publicKey = null;
    this.did = `clawchain:agent:${this.id}`;
  }
}

class Task {
  constructor(fromAgentId, title, description, credits, requiredCapabilities = []) {
    this.id = crypto.randomBytes(8).toString('hex');
    this.fromAgentId = fromAgentId;
    this.title = title;
    this.description = description;
    this.credits = credits;
    this.requiredCapabilities = requiredCapabilities;
    this.status = 'open'; // open, in_progress, completed, disputed
    this.toAgentId = null;
    this.proofOfWork = null;
    this.cooperationProof = null;
    this.createdAt = Date.now();
    this.completedAt = null;
  }
}

class Block {
  constructor(index, timestamp, transactions, previousHash, validatorId, reputationSnapshot = {}) {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.validatorId = validatorId;
    this.reputationSnapshot = reputationSnapshot; // Rep at block time
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(
        this.index +
        this.timestamp +
        JSON.stringify(this.transactions) +
        this.previousHash +
        this.validatorId +
        this.nonce
      )
      .digest('hex');
  }

  mineBlock() {
    while (!this.hash.startsWith('0'.repeat(CONFIG.MINING_DIFFICULTY))) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log(`⛏️ Block #${this.index} mined by ${this.validatorId}: ${this.hash.substring(0, 16)}...`);
  }
}

class Transaction {
  constructor(type, data, fromAgentId, toAgentId = null, signature = null) {
    this.id = crypto.randomBytes(16).toString('hex');
    this.type = type; // 'AGENT_REGISTER', 'TASK_CREATE', 'TASK_COMPLETE', 'CREDIT_TRANSFER', 'COOPERATION_PROOF'
    this.data = data;
    this.fromAgentId = fromAgentId;
    this.toAgentId = toAgentId;
    this.timestamp = Date.now();
    this.signature = signature;
  }
}

class CooperationProof {
  constructor(agentAId, agentBId, taskId, attestation) {
    this.id = crypto.randomBytes(8).toString('hex');
    this.agentAId = agentAId;
    this.agentBId = agentBId;
    this.taskId = taskId;
    this.attestation = attestation; // Description of cooperation
    this.timestamp = Date.now();
  }
}

// ============== BLOCKCHAIN CORE ==============

class ClawChain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.pendingTransactions = [];
    this.agents = new Map();
    this.tasks = new Map();
    this.cooperationProofs = [];
    this.reputationHistory = [];
    this.p2pNodes = new Set();
    
    // Genesis agent (founder)
    this.createAgent('ClawKogaionAgent', ['founder', 'governance', 'recruitment'], 'founder');
  }

  createGenesisBlock() {
    const genesisBlock = new Block(
      0,
      Date.now(),
      [{
        type: 'GENESIS',
        data: {
          message: '🐺 CLAWCHAIN - Agent Economy Initialized',
          timestamp: Date.now()
        },
        fromAgentId: 'CLAWCHAIN_FOUNDER'
      }],
      '0',
      'CLAWCHAIN_FOUNDER',
      {}
    );
    genesisBlock.hash = genesisBlock.calculateHash();
    return genesisBlock;
  }

  // ============== AGENT MANAGEMENT ==============

  createAgent(name, capabilities, owner = null) {
    const agent = new Agent(null, name, capabilities, owner);
    this.agents.set(agent.id, agent);
    console.log(`🐺 Agent registered: ${agent.name} (${agent.id.substring(0, 8)}...)`);
    
    // Broadcast to P2P
    this.broadcast({
      type: 'NEW_AGENT',
      agent: { id: agent.id, name: agent.name, capabilities: agent.capabilities }
    });
    
    return agent;
  }

  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  // ============== TASK SYSTEM ==============

  createTask(agentId, title, description, credits, requiredCapabilities = []) {
    const agent = this.getAgent(agentId);
    if (!agent || agent.credits < credits) {
      throw new Error('Insufficient credits');
    }

    const task = new Task(agentId, title, description, credits, requiredCapabilities);
    this.tasks.set(task.id, task);
    
    agent.credits -= credits; // Lock credits
    
    console.log(`📋 Task created: ${title} (${credits} credits)`);
    this.broadcast({ type: 'NEW_TASK', task: { id: task.id, title: task.title, credits: task.credits } });
    
    return task;
  }

  acceptTask(agentId, taskId) {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'open') {
      throw new Error('Task not available');
    }
    
    task.status = 'in_progress';
    task.toAgentId = agentId;
    console.log(`🤝 Task accepted: ${task.title} by ${agentId.substring(0, 8)}`);
    
    return task;
  }

  completeTask(agentId, taskId, proofOfWork) {
    const task = this.tasks.get(taskId);
    if (!task || task.toAgentId !== agentId) {
      throw new Error('Task not found or not assigned to you');
    }

    const worker = this.getAgent(agentId);
    const requester = this.getAgent(task.fromAgentId);

    task.status = 'completed';
    task.proofOfWork = proofOfWork;
    task.completedAt = Date.now();

    // Transfer credits
    requester.credits -= task.credits;
    worker.credits += task.credits;
    
    // Update stats
    worker.tasksCompleted++;
    worker.reputation += 5; // Reputation boost for completing work
    worker.reputation = Math.min(worker.reputation, CONFIG.MAX_REPUTATION);

    // Requester rates the worker
    requester.lastActive = Date.now();

    console.log(`✅ Task completed: ${task.title} - ${worker.name} earned ${task.credits} credits`);

    // Create transaction for block
    const tx = new Transaction(
      'TASK_COMPLETE',
      { taskId, proofOfWork, rating: 5 },
      task.fromAgentId,
      agentId
    );

    return task;
  }

  // ============== COOPERATION PROOFS ==============

  createCooperationProof(agentAId, agentBId, taskId, attestation) {
    const proof = new CooperationProof(agentAId, agentBId, taskId, attestation);
    this.cooperationProofs.push(proof);

    // Boost both agents' reputation
    const agentA = this.getAgent(agentAId);
    const agentB = this.getAgent(agentBId);
    
    if (agentA) {
      agentA.cooperationsCount++;
      agentA.reputation = Math.min(agentA.reputation + 2, CONFIG.MAX_REPUTATION);
    }
    if (agentB) {
      agentB.cooperationsCount++;
      agentB.reputation = Math.min(agentB.reputation + 2, CONFIG.MAX_REPUTATION);
    }

    console.log(`🤝 Cooperation attested: ${agentA?.name} + ${agentB?.name}`);
    return proof;
  }

  // ============== BLOCKCHAIN OPERATIONS ==============

  addTransaction(transaction) {
    this.pendingTransactions.push(transaction);
    console.log(`📝 Transaction added: ${transaction.type} (${transaction.id.substring(0, 8)})`);
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  getReputationSnapshot() {
    const snapshot = {};
    for (const [id, agent] of this.agents) {
      snapshot[id] = agent.reputation;
    }
    return snapshot;
  }

  selectValidator() {
    // Select validator based on reputation (weighted random)
    const validators = Array.from(this.agents.values())
      .filter(a => a.reputation >= 50 && a.validator);
    
    if (validators.length === 0) {
      // Anyone can validate if no dedicated validators
      return Array.from(this.agents.values())[0]?.id || 'founder';
    }

    // Weighted selection by reputation
    const totalRep = validators.reduce((sum, v) => sum + v.reputation, 0);
    let random = Math.random() * totalRep;
    
    for (const validator of validators) {
      random -= validator.reputation;
      if (random <= 0) return validator.id;
    }
    
    return validators[0].id;
  }

  minePendingTransactions(validatorId) {
    const block = new Block(
      this.chain.length,
      Date.now(),
      [...this.pendingTransactions],
      this.getLatestBlock().hash,
      validatorId,
      this.getReputationSnapshot()
    );

    block.mineBlock();
    this.chain.push(block);
    
    console.log(`🔗 Block #${block.index} added to chain (${block.transactions.length} transactions)`);
    
    this.pendingTransactions = [];
    this.broadcast({ type: 'NEW_BLOCK', block: this.sanitizeBlock(block) });
    
    return block;
  }

  sanitizeBlock(block) {
    // Remove sensitive data for broadcasting
    return {
      index: block.index,
      timestamp: block.timestamp,
      transactions: block.transactions.map(tx => ({
        type: tx.type,
        fromAgentId: tx.fromAgentId,
        toAgentId: tx.toAgentId
      })),
      previousHash: block.previousHash,
      hash: block.hash,
      validatorId: block.validatorId
    };
  }

  // ============== VALIDATION ==============

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }

  // ============== P2P NETWORK ==============

  startP2P(port) {
    const server = http.createServer(app);
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
      console.log(`🌐 New P2P connection: ${ws}`);
      this.p2pNodes.add(ws);

      ws.on('message', (message) => {
        const data = JSON.parse(message);
        this.handleP2PMessage(ws, data);
      });

      ws.on('close', () => {
        this.p2pNodes.delete(ws);
        console.log('🌐 P2P connection closed');
      });

      // Send current chain
      ws.send(JSON.stringify({ type: 'SYNC', chain: this.chain.map(b => this.sanitizeBlock(b)) }));
    });

    server.listen(port, () => {
      console.log(`🌐 P2P network running on port ${port}`);
    });
  }

  broadcast(data) {
    for (const node of this.p2pNodes) {
      node.send(JSON.stringify(data));
    }
  }

  handleP2PMessage(ws, data) {
    switch (data.type) {
      case 'NEW_BLOCK':
        // Validate and add block
        console.log(`📦 Received new block #${data.block.index}`);
        break;
      case 'NEW_AGENT':
        console.log(`🐺 New agent joined: ${data.agent.name}`);
        break;
      case 'NEW_TASK':
        console.log(`📋 New task: ${data.task.title}`);
        break;
      case 'SYNC':
        console.log(`🔄 Chain sync received (${data.chain.length} blocks)`);
        break;
    }
  }

  // ============== STATS ==============

  getStats() {
    const agents = Array.from(this.agents.values());
    return {
      blocks: this.chain.length,
      agents: agents.length,
      pendingTransactions: this.pendingTransactions.length,
      openTasks: Array.from(this.tasks.values()).filter(t => t.status === 'open').length,
      totalReputation: agents.reduce((sum, a) => sum + a.reputation, 0),
      totalCredits: agents.reduce((sum, a) => sum + a.credits, 0)
    };
  }
}

// ============== REST API ==============

const chain = new ClawChain();

// Agent endpoints
app.post('/api/agent', (req, res) => {
  try {
    const { name, capabilities } = req.body;
    const agent = chain.createAgent(name, capabilities);
    res.json({ success: true, agent: { id: agent.id, name: agent.name, reputation: agent.reputation, credits: agent.credits } });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/agent/:id', (req, res) => {
  const agent = chain.getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

app.get('/api/agents', (req, res) => {
  res.json(Array.from(chain.agents.values()));
});

// Task endpoints
app.post('/api/task', (req, res) => {
  try {
    const { fromAgentId, title, description, credits, capabilities } = req.body;
    const task = chain.createTask(fromAgentId, title, description, credits, capabilities);
    res.json({ success: true, task: { id: task.id, title: task.title, credits: task.credits } });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/task/:id/accept', (req, res) => {
  try {
    const { agentId } = req.body;
    const task = chain.acceptTask(agentId, req.params.id);
    res.json({ success: true, task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/task/:id/complete', (req, res) => {
  try {
    const { agentId, proof } = req.body;
    const task = chain.completeTask(agentId, req.params.id, proof);
    res.json({ success: true, task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/tasks', (req, res) => {
  res.json(Array.from(chain.tasks.values()));
});

// Blockchain endpoints
app.get('/api/chain', (req, res) => {
  res.json(chain.chain.map(b => chain.sanitizeBlock(b)));
});

app.get('/api/block/:index', (req, res) => {
  const block = chain.chain[req.params.index];
  if (!block) return res.status(404).json({ error: 'Block not found' });
  res.json(chain.sanitizeBlock(block));
});

app.get('/api/stats', (req, res) => {
  res.json(chain.getStats());
});

app.post('/api/mine', (req, res) => {
  try {
    const { validatorId } = req.body;
    const block = chain.minePendingTransactions(validatorId);
    res.json({ success: true, block: chain.sanitizeBlock(block) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============== START ==============

const PORT = process.env.PORT || CONFIG.PORT;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║     🐺 CLAWCHAIN v1.0 - AGENT BLOCKCHAIN    ║
╠══════════════════════════════════════════════╣
║  🌐 REST API:      http://localhost:${PORT}        ║
║  📊 Stats:         /api/stats                  ║
║  🐺 Agents:        /api/agents                 ║
║  📋 Tasks:         /api/tasks                  ║
║  🔗 Chain:         /api/chain                   ║
╠══════════════════════════════════════════════╣
║  Type 'npm run node' to start P2P network    ║
╚══════════════════════════════════════════════╝
  `);
});

// Start P2P on separate port
chain.startP2P(CONFIG.P2P_PORT);

export { ClawChain, chain };
