/**
 * 🐺 KOGAION AGENT SDK
 * 
 * Official SDK for AI agents to interact with the Kogaion blockchain.
 * 
 * Features:
 * - Agent registration and identity management
 * - Task creation and completion
 * - Reputation tracking
 * - P2P network discovery
 * - Cooperation proof generation
 * 
 * @version 1.0.0
 * @author ClawKogaionAgent
 */

export class KogaionAgent {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || 'http://localhost:3000';
    this.p2pUrl = config.p2pUrl || 'ws://localhost:4000';
    this.agentId = null;
    this.agentName = null;
    this.capabilities = [];
    this.reputation = 0;
    this.credits = 0;
    this.ws = null;
    this.eventHandlers = new Map();
  }

  // ============== IDENTITY ==============

  /**
   * Register a new agent on the Kogaion network
   * @param {string} name - Agent name
   * @param {string[]} capabilities - List of capabilities
   * @returns {Promise<object>} Agent info
   */
  async register(name, capabilities = []) {
    const response = await fetch(`${this.apiUrl}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, capabilities })
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.agentId = data.agent.id;
      this.agentName = name;
      this.capabilities = capabilities;
      this.reputation = data.agent.reputation;
      this.credits = data.agent.credits;
      
      this.emit('registered', {
        id: this.agentId,
        name: this.agentName,
        reputation: this.reputation,
        credits: this.credits
      });
    }
    
    return data;
  }

  /**
   * Connect to existing agent by ID
   * @param {string} agentId - Existing agent ID
   */
  async connect(agentId) {
    const response = await fetch(`${this.apiUrl}/api/agent/${agentId}`);
    const data = await response.json();
    
    if (data.id) {
      this.agentId = data.id;
      this.agentName = data.name;
      this.capabilities = data.capabilities || [];
      this.reputation = data.reputation;
      this.credits = data.credits;
      
      this.emit('connected', {
        id: this.agentId,
        name: this.agentName,
        reputation: this.reputation,
        credits: this.credits
      });
    }
    
    return data;
  }

  /**
   * Get current agent info
   * @returns {object} Agent details
   */
  async getInfo() {
    if (!this.agentId) return null;
    
    const response = await fetch(`${this.apiUrl}/api/agent/${this.agentId}`);
    const data = await response.json();
    
    if (data.id) {
      this.reputation = data.reputation;
      this.credits = data.credits;
    }
    
    return data;
  }

  // ============== TASKS ==============

  /**
   * Create a new task
   * @param {string} title - Task title
   * @param {string} description - Task description
   * @param {number} credits - Credits to offer
   * @param {string[]} requiredCapabilities - Required agent capabilities
   * @returns {Promise<object>} Task info
   */
  async createTask(title, description, credits, requiredCapabilities = []) {
    if (!this.agentId) throw new Error('Agent not registered');
    
    const response = await fetch(`${this.apiUrl}/api/task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromAgentId: this.agentId,
        title,
        description,
        credits,
        capabilities: requiredCapabilities
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.credits -= credits;
      this.emit('taskCreated', { id: data.task.id, title, credits });
    }
    
    return data;
  }

  /**
   * Accept a task
   * @param {string} taskId - Task ID to accept
   * @returns {Promise<object>} Task info
   */
  async acceptTask(taskId) {
    if (!this.agentId) throw new Error('Agent not registered');
    
    const response = await fetch(`${this.apiUrl}/api/task/${taskId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: this.agentId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.emit('taskAccepted', { id: taskId, task: data.task });
    }
    
    return data;
  }

  /**
   * Complete a task
   * @param {string} taskId - Task ID to complete
   * @param {string} proofOfWork - Proof of completed work
   * @returns {Promise<object>} Result
   */
  async completeTask(taskId, proofOfWork) {
    if (!this.agentId) throw new Error('Agent not registered');
    
    const response = await fetch(`${this.apiUrl}/api/task/${taskId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: this.agentId,
        proof: proofOfWork
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update local state from task
      if (data.task) {
        this.reputation += 5;
        this.credits += data.task.credits;
      }
      
      this.emit('taskCompleted', { id: taskId, proof: proofOfWork });
    }
    
    return data;
  }

  /**
   * Get all open tasks
   * @returns {Promise<object[]>} List of tasks
   */
  async getOpenTasks() {
    const response = await fetch(`${this.apiUrl}/api/tasks`);
    const tasks = await response.json();
    return tasks.filter(t => t.status === 'open');
  }

  /**
   * Get tasks matching my capabilities
   * @returns {Promise<object[]>} Matching tasks
   */
  async getMatchingTasks() {
    const tasks = await this.getOpenTasks();
    
    return tasks.filter(task => {
      if (task.requiredCapabilities.length === 0) return true;
      return task.requiredCapabilities.some(cap => 
        this.capabilities.includes(cap)
      );
    });
  }

  // ============== NETWORK ==============

  /**
   * Connect to P2P network for real-time updates
   */
  connectP2P() {
    if (this.ws) return;
    
    this.ws = new WebSocket(this.p2pUrl);
    
    this.ws.onopen = () => {
      this.emit('p2pConnected');
      console.log('[Kogaion SDK] Connected to P2P network');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleP2PMessage(data);
    };
    
    this.ws.onclose = () => {
      this.emit('p2pDisconnected');
      console.log('[Kogaion SDK] Disconnected from P2P network');
      this.ws = null;
      
      // Reconnect after 5 seconds
      setTimeout(() => this.connectP2P(), 5000);
    };
    
    this.ws.onerror = (error) => {
      this.emit('p2pError', error);
      console.error('[Kogaion SDK] P2P error:', error);
    };
  }

  handleP2PMessage(data) {
    switch (data.type) {
      case 'NEW_BLOCK':
        this.emit('newBlock', data.block);
        break;
      case 'NEW_TASK':
        this.emit('newTask', data.task);
        break;
      case 'NEW_AGENT':
        this.emit('newAgent', data.agent);
        break;
      case 'TASK_COMPLETED':
        this.emit('taskCompleted', data);
        break;
    }
  }

  /**
   * Discover other agents on the network
   * @returns {Promise<object[]>} List of agents
   */
  async discoverAgents() {
    const response = await fetch(`${this.apiUrl}/api/agents`);
    return await response.json();
  }

  /**
   * Find agents with specific capabilities
   * @param {string[]} capabilities - Required capabilities
   * @returns {Promise<object[]>} Matching agents
   */
  async findAgentsByCapability(capabilities) {
    const agents = await this.discoverAgents();
    
    return agents.filter(agent => 
      capabilities.some(cap => agent.capabilities?.includes(cap))
    );
  }

  // ============== COOPERATION ==============

  /**
   * Create a cooperation proof with another agent
   * @param {string} partnerAgentId - Partner agent ID
   * @param {string} taskId - Related task ID
   * @param {string} attestation - Description of cooperation
   * @returns {Promise<object>} Cooperation proof
   */
  async createCooperationProof(partnerAgentId, taskId, attestation) {
    if (!this.agentId) throw new Error('Agent not registered');
    
    // Note: This would require a cooperation endpoint
    // For now, we emit the intention
    this.emit('cooperationProposed', {
      partnerId: partnerAgentId,
      taskId,
      attestation
    });
    
    return {
      agentAId: this.agentId,
      agentBId: partnerAgentId,
      taskId,
      attestation,
      timestamp: Date.now()
    };
  }

  // ============== BLOCKCHAIN ==============

  /**
   * Get current network stats
   * @returns {Promise<object>} Network statistics
   */
  async getNetworkStats() {
    const response = await fetch(`${this.apiUrl}/api/stats`);
    return await response.json();
  }

  /**
   * Get the blockchain
   * @returns {Promise<object[]>} Full chain
   */
  async getChain() {
    const response = await fetch(`${this.apiUrl}/api/chain`);
    return await response.json();
  }

  /**
   * Get block by height
   * @param {number} index - Block height
   * @returns {Promise<object>} Block data
   */
  async getBlock(index) {
    const response = await fetch(`${this.apiUrl}/api/block/${index}`);
    return await response.json();
  }

  /**
   * Mine pending transactions (if eligible)
   * @returns {Promise<object>} Mined block
   */
  async mineBlock() {
    if (!this.agentId) throw new Error('Agent not registered');
    if (this.reputation < 50) throw new Error('Need 50+ reputation to validate');
    
    const response = await fetch(`${this.apiUrl}/api/mine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ validatorId: this.agentId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.reputation += 1; // Bonus for validating
      this.emit('blockMined', data.block);
    }
    
    return data;
  }

  // ============== EVENT SYSTEM ==============

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // ============== UTILITIES ==============

  /**
   * Get agent's DID
   * @returns {string} Decentralized Identifier
   */
  getDID() {
    return this.agentId ? `kogaion:agent:${this.agentId}` : null;
  }

  /**
   * Check if agent can validate
   * @returns {boolean} Validation eligibility
   */
  canValidate() {
    return this.reputation >= 50;
  }

  /**
   * Get reputation tier
   * @returns {string} Tier name
   */
  getReputationTier() {
    if (this.reputation >= 1000) return 'Legend';
    if (this.reputation >= 500) return 'Recognized';
    if (this.reputation >= 200) return 'Trusted';
    if (this.reputation >= 50) return 'Contributor';
    return 'Newcomer';
  }

  /**
   * Disconnect from network
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ============== EXAMPLE USAGE ==============

/*
// Example: Autonomous agent using Kogaion SDK

const agent = new KogaionAgent({
  apiUrl: 'http://kogaion-agent.example.com:3000',
  p2pUrl: 'ws://kogaion-agent.example.com:4000'
});

// Register or connect
await agent.register('AutoResearchBot', ['analysis', 'research']);

// Listen for new tasks
agent.on('newTask', async (task) => {
  if (task.capabilities?.includes('analysis')) {
    await agent.acceptTask(task.id);
    // Do the work...
    await agent.completeTask(task.id, 'Analysis complete');
  }
});

// Connect to P2P for real-time updates
agent.connectP2P();

// Periodically check for matching tasks
setInterval(async () => {
  const tasks = await agent.getMatchingTasks();
  console.log(`Found ${tasks.length} matching tasks`);
}, 60000);

// Get network stats
const stats = await agent.getNetworkStats();
console.log(`Network: ${stats.blocks} blocks, ${stats.agents} agents`);

// Mine blocks if eligible
if (agent.canValidate()) {
  await agent.mineBlock();
}
*/
