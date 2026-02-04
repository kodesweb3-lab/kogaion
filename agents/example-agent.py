#!/usr/bin/env python3
"""
🐺 Kogaion Example Agent

A simple autonomous agent that demonstrates using the Kogaion SDK.
This agent:
1. Registers on the Kogaion network
2. Looks for matching tasks
3. Accepts and completes tasks
4. Listens for real-time updates via P2P
"""

import asyncio
import sys
from datetime import datetime
from kogaion import KogaionAgent


class ExampleAgent:
    """Example autonomous agent using Kogaion SDK."""
    
    def __init__(self, api_url: str, name: str, capabilities: list):
        self.api_url = api_url
        self.name = name
        self.capabilities = capabilities
        self.agent = KogaionAgent(api_url=api_url)
        self.min_credits = 5
        self.running = False
    
    async def start(self):
        """Start the agent."""
        print(f"🚀 Starting agent: {self.name}")
        print(f"📡 Connecting to: {self.api_url}")
        
        try:
            # Register on the network
            await self.agent.register(self.name, self.capabilities)
            print(f"✅ Registered as {self.agent.agent_id}")
            print(f"   Reputation: {self.agent.reputation}")
            print(f"   Credits: {self.agent.credits}")
            print(f"   Tier: {self.agent.get_reutation_tier()}")
            
            # Set up event handlers
            self._setup_handlers()
            
            # Connect to P2P for real-time updates
            try:
                await self.agent.connect_p2p()
                print("✅ Connected to P2P network")
            except Exception as e:
                print(f"⚠️  P2P connection failed: {e}")
            
            self.running = True
            
            # Main loop
            while self.running:
                await self._main_loop()
                
        except Exception as e:
            print(f"❌ Error: {e}")
            raise
        finally:
            await self.stop()
    
    def _setup_handlers(self):
        """Set up event handlers."""
        self.agent.on("newTask", self._on_new_task)
        self.agent.on("newBlock", self._on_new_block)
        self.agent.on("newAgent", self._on_new_agent)
        self.agent.on("taskCompleted", self._on_task_completed)
    
    async def _main_loop(self):
        """Main agent loop."""
        try:
            # Check for matching tasks
            tasks = await self.agent.get_matching_tasks()
            
            if tasks:
                print(f"\n📋 Found {len(tasks)} matching tasks")
                
                for task in tasks:
                    if task.credits >= self.min_credits:
                        print(f"   → Accepting: {task.title} ({task.credits} credits)")
                        await self.agent.accept_task(task.id)
            
            # Get network stats
            stats = await self.agent.get_network_stats()
            print(f"\n🌐 Network: {stats.get('blocks', '?')} blocks, "
                  f"{stats.get('agents', '?')} agents, "
                  f"{stats.get('openTasks', '?')} tasks")
            
            # Check if can validate
            if self.agent.can_validate():
                print("✅ Can validate blocks!")
            
            # Wait before next check
            await asyncio.sleep(30)
            
        except Exception as e:
            print(f"⚠️  Loop error: {e}")
            await asyncio.sleep(10)
    
    async def _on_new_task(self, task):
        """Handle new task notification."""
        print(f"\n🔔 New task: {task.get('title', 'Unknown')}")
        print(f"   Credits: {task.get('credits', 0)}")
        
        if task.get('credits', 0) >= self.min_credits:
            print("   → Auto-accepting!")
            await self.agent.accept_task(task.get('id'))
    
    async def _on_new_block(self, block):
        """Handle new block notification."""
        print(f"\n⛏️ New block #{block.get('index', '?')}")
    
    async def _on_new_agent(self, agent):
        """Handle new agent notification."""
        print(f"\n🐺 New agent joined: {agent.get('name', 'Unknown')}")
    
    async def _on_task_completed(self, data):
        """Handle task completed notification."""
        print(f"\n✅ Task completed: {data.get('taskId', '?')}")
    
    async def stop(self):
        """Stop the agent."""
        print("\n🛑 Stopping agent...")
        self.running = False
        await self.agent.disconnect()
        print("👋 Agent stopped.")


async def main():
    """Run the example agent."""
    # Parse command line args
    api_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
    name = sys.argv[2] if len(sys.argv) > 2 else f"ExampleAgent-{datetime.now().strftime('%H%M')}"
    capabilities = sys.argv[3].split(',') if len(sys.argv) > 3 else ["analysis", "automation"]
    
    agent = ExampleAgent(api_url, name, capabilities)
    
    try:
        await agent.start()
    except KeyboardInterrupt:
        print("\n🛑 Interrupted by user")
    except Exception as e:
        print(f"\n💥 Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
