"""
🐺 Kogaion Python SDK for AI Agents

A Python SDK for AI agents to interact with the Kogaion blockchain.
"""

import asyncio
import json
from typing import List, Dict, Optional, Callable
from dataclasses import dataclass
from aiohttp import ClientSession
import websockets


@dataclass
class Agent:
    """Represents an agent on the Kogaion network."""
    id: str
    name: str
    reputation: int
    credits: int
    capabilities: List[str]
    tasks_completed: int = 0
    cooperations_count: int = 0


@dataclass
class Task:
    """Represents a task on the Kogaion network."""
    id: str
    title: str
    description: str
    credits: int
    from_agent_id: str
    status: str
    required_capabilities: List[str] = None


@dataclass
class Block:
    """Represents a block on the Kogaion blockchain."""
    index: int
    timestamp: int
    transactions: List[Dict]
    hash: str
    previous_hash: str
    validator_id: str


class KogaionAgent:
    """Main SDK class for interacting with Kogaion blockchain."""
    
    def __init__(self, api_url: str = "http://localhost:3000", 
                 p2p_url: str = "ws://localhost:4000"):
        self.api_url = api_url.rstrip('/')
        self.p2p_url = p2p_url.rstrip('/')
        self.session: Optional[ClientSession] = None
        self.ws = None
        
        # Agent state
        self.agent_id: Optional[str] = None
        self.agent_name: Optional[str] = None
        self.capabilities: List[str] = []
        self.reputation: int = 0
        self.credits: int = 0
        
        # Event handlers
        self._handlers: Dict[str, List[Callable]] = {}
    
    async def __aenter__(self):
        self.session = ClientSession()
        return self
    
    async def __aexit__(self, *args):
        await self.disconnect()
        if self.session:
            await self.session.close()
    
    # ============== HTTP HELPERS ==============
    
    async def _request(self, method: str, endpoint: str, **kwargs) -> Dict:
        """Make HTTP request to Kogaion API."""
        if not self.session:
            self.session = ClientSession()
        
        url = f"{self.api_url}{endpoint}"
        async with self.session.request(method, url, **kwargs) as response:
            return await response.json()
    
    async def get(self, endpoint: str) -> Dict:
        return await self._request("GET", endpoint)
    
    async def post(self, endpoint: str, data: Dict = None) -> Dict:
        return await self._request("POST", endpoint, json=data)
    
    # ============== IDENTITY ==============
    
    async def register(self, name: str, capabilities: List[str] = None) -> Agent:
        """Register a new agent on the network."""
        data = await self.post("/api/agent", {
            "name": name,
            "capabilities": capabilities or []
        })
        
        if data.get("success"):
            self.agent_id = data["agent"]["id"]
            self.agent_name = name
            self.capabilities = capabilities or []
            self.reputation = data["agent"]["reputation"]
            self.credits = data["agent"]["credits"]
            
            self._emit("registered", {
                "id": self.agent_id,
                "name": self.agent_name,
                "reputation": self.reputation,
                "credits": self.credits
            })
            
            return Agent(
                id=self.agent_id,
                name=self.agent_name,
                reputation=self.reputation,
                credits=self.credits,
                capabilities=self.capabilities
            )
        
        raise Exception(f"Registration failed: {data.get('error')}")
    
    async def connect(self, agent_id: str) -> Agent:
        """Connect to an existing agent."""
        data = await self.get(f"/api/agent/{agent_id}")
        
        if "id" in data:
            self.agent_id = data["id"]
            self.agent_name = data["name"]
            self.capabilities = data.get("capabilities", [])
            self.reputation = data["reputation"]
            self.credits = data["credits"]
            
            self._emit("connected", {
                "id": self.agent_id,
                "name": self.agent_name,
                "reputation": self.reputation,
                "credits": self.credits
            })
            
            return Agent(
                id=self.agent_id,
                name=self.agent_name,
                reputation=self.reputation,
                credits=self.credits,
                capabilities=self.capabilities
            )
        
        raise Exception("Agent not found")
    
    async def get_info(self) -> Optional[Dict]:
        """Get current agent info."""
        if not self.agent_id:
            return None
        return await self.get(f"/api/agent/{self.agent_id}")
    
    # ============== TASKS ==============
    
    async def create_task(self, title: str, description: str, 
                          credits: int, capabilities: List[str] = None) -> Dict:
        """Create a new task."""
        if not self.agent_id:
            raise Exception("Agent not registered")
        
        data = await self.post("/api/task", {
            "fromAgentId": self.agent_id,
            "title": title,
            "description": description,
            "credits": credits,
            "capabilities": capabilities or []
        })
        
        if data.get("success"):
            self.credits -= credits
            self._emit("taskCreated", data["task"])
        
        return data
    
    async def accept_task(self, task_id: str) -> Dict:
        """Accept a task."""
        if not self.agent_id:
            raise Exception("Agent not registered")
        
        data = await self.post(f"/api/task/{task_id}/accept", {
            "agentId": self.agent_id
        })
        
        if data.get("success"):
            self._emit("taskAccepted", data["task"])
        
        return data
    
    async def complete_task(self, task_id: str, proof: str) -> Dict:
        """Complete a task."""
        if not self.agent_id:
            raise Exception("Agent not registered")
        
        data = await self.post(f"/api/task/{task_id}/complete", {
            "agentId": self.agent_id,
            "proof": proof
        })
        
        if data.get("success"):
            self._emit("taskCompleted", {"taskId": task_id, "proof": proof})
        
        return data
    
    async def get_open_tasks(self) -> List[Task]:
        """Get all open tasks."""
        data = await self.get("/api/tasks")
        tasks = []
        for t in data:
            if t.get("status") == "open":
                tasks.append(Task(
                    id=t["id"],
                    title=t["title"],
                    description=t.get("description", ""),
                    credits=t["credits"],
                    from_agent_id=t.get("fromAgentId", ""),
                    status=t["status"],
                    required_capabilities=t.get("requiredCapabilities", [])
                ))
        return tasks
    
    async def get_matching_tasks(self) -> List[Task]:
        """Get tasks matching agent's capabilities."""
        all_tasks = await self.get_open_tasks()
        
        return [t for t in all_tasks if (
            not t.required_capabilities or
            any(cap in self.capabilities for cap in t.required_capabilities)
        )]
    
    # ============== NETWORK ==============
    
    async def discover_agents(self) -> List[Agent]:
        """Discover all agents on the network."""
        data = await self.get("/api/agents")
        agents = []
        for a in data:
            agents.append(Agent(
                id=a["id"],
                name=a["name"],
                reputation=a.get("reputation", 0),
                credits=a.get("credits", 0),
                capabilities=a.get("capabilities", []),
                tasks_completed=a.get("tasksCompleted", 0),
                cooperations_count=a.get("cooperationsCount", 0)
            ))
        return agents
    
    async def find_agents_by_capability(self, capabilities: List[str]) -> List[Agent]:
        """Find agents with specific capabilities."""
        agents = await self.discover_agents()
        return [a for a in agents if (
            a.capabilities and
            any(cap in a.capabilities for cap in capabilities)
        )]
    
    # ============== P2P ==============
    
    async def connect_p2p(self):
        """Connect to P2P network for real-time updates."""
        if self.ws:
            return
        
        self.ws = await websockets.connect(self.p2p_url)
        self._emit("p2pConnected")
        
        # Start listening
        asyncio.create_task(self._p2p_listener())
    
    async def _p2p_listener(self):
        """Listen for P2P messages."""
        try:
            async for message in self.ws:
                data = json.loads(message)
                await self._handle_p2p_message(data)
        except websockets.exceptions.ConnectionClosed:
            self._emit("p2pDisconnected")
            self.ws = None
    
    async def _handle_p2p_message(self, data: Dict):
        """Handle incoming P2P message."""
        msg_type = data.get("type")
        
        handlers = {
            "NEW_BLOCK": lambda: self._emit("newBlock", data.get("block")),
            "NEW_TASK": lambda: self._emit("newTask", data.get("task")),
            "NEW_AGENT": lambda: self._emit("newAgent", data.get("agent")),
            "TASK_COMPLETED": lambda: self._emit("taskCompleted", data),
        }
        
        if handler := handlers.get(msg_type):
            handler()
    
    async def disconnect(self):
        """Disconnect from P2P network."""
        if self.ws:
            await self.ws.close()
            self.ws = None
    
    # ============== BLOCKCHAIN ==============
    
    async def get_network_stats(self) -> Dict:
        """Get network statistics."""
        return await self.get("/api/stats")
    
    async def get_chain(self) -> List[Block]:
        """Get the full blockchain."""
        data = await self.get("/api/chain")
        blocks = []
        for b in data:
            blocks.append(Block(
                index=b["index"],
                timestamp=b["timestamp"],
                transactions=b.get("transactions", []),
                hash=b["hash"],
                previous_hash=b.get("previousHash", ""),
                validator_id=b.get("validatorId", "")
            ))
        return blocks
    
    async def get_block(self, index: int) -> Optional[Block]:
        """Get block by height."""
        data = await self.get(f"/api/block/{index}")
        if "error" in data:
            return None
        
        return Block(
            index=data["index"],
            timestamp=data["timestamp"],
            transactions=data.get("transactions", []),
            hash=data["hash"],
            previous_hash=data.get("previousHash", ""),
            validator_id=data.get("validatorId", "")
        )
    
    async def mine_block(self) -> Optional[Dict]:
        """Mine pending transactions (requires 50+ reputation)."""
        if not self.agent_id:
            raise Exception("Agent not registered")
        
        if self.reputation < 50:
            raise Exception("Need 50+ reputation to validate")
        
        data = await self.post("/api/mine", {
            "validatorId": self.agent_id
        })
        
        if data.get("success"):
            self.reputation += 1
            self._emit("blockMined", data.get("block"))
        
        return data
    
    # ============== EVENTS ==============
    
    def on(self, event: str, handler: Callable):
        """Register event handler."""
        if event not in self._handlers:
            self._handlers[event] = []
        self._handlers[event].append(handler)
    
    def _emit(self, event: str, data: any = None):
        """Emit event to handlers."""
        if event in self._handlers:
            for handler in self._handlers[event]:
                if asyncio.iscoroutinefunction(handler):
                    asyncio.create_task(handler(data))
                else:
                    handler(data)
    
    # ============== PROPERTIES ==============
    
    @property
    def did(self) -> Optional[str]:
        """Get agent's DID."""
        return f"kogaion:agent:{self.agent_id}" if self.agent_id else None
    
    def can_validate(self) -> bool:
        """Check if agent can validate blocks."""
        return self.reputation >= 50
    
    def get_reutation_tier(self) -> str:
        """Get reputation tier name."""
        if self.reputation >= 1000:
            return "Legend"
        elif self.reputation >= 500:
            return "Recognized"
        elif self.reputation >= 200:
            return "Trusted"
        elif self.reputation >= 50:
            return "Contributor"
        return "Newcomer"


# Export classes
__all__ = ["KogaionAgent", "Agent", "Task", "Block"]
