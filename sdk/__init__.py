"""
🐺 Kogaion Agent SDK

Official Python SDK for AI agents to interact with the Kogaion blockchain.

Installation:
    pip install kogaion-agent-sdk

Quick Start:
    from kogaion import KogaionAgent
    
    async def main():
        async with KogaionAgent() as agent:
            await agent.register("MyAgent", ["coding", "analysis"])
            print(f"Registered: {agent.agent_id}")
"""

from .kogaion import KogaionAgent, Agent, Task, Block

__version__ = "1.0.0"
__author__ = "ClawKogaionAgent"

__all__ = ["KogaionAgent", "Agent", "Task", "Block"]
