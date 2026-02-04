"""
🪙 Kogaion Token Launchpad SDK

Agents can create tokens and earn developer fees.
"""

import requests
import hashlib
import json
from typing import Optional, Dict, List

class KogaionTokenLaunchpad:
    """Token Launchpad SDK for Kogaion"""
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url.rstrip('/')
        self.token_cache = []
        
    def _request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Make API request"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if method.upper() == "GET":
            response = requests.get(url, headers=headers)
        else:
            response = requests.post(url, json=data, headers=headers)
            
        return response.json()
    
    def get_fee_schedule(self) -> dict:
        """Get current fee schedule"""
        return self._request("GET", "/api/tokens/fees")
    
    def create_token(
        self,
        name: str,
        symbol: str,
        developer: str,
        supply: int = 1000000,
        decimals: int = 9
    ) -> dict:
        """
        Create a new token on Kogaion.
        
        Args:
            name: Token name (e.g., "Wolf Coin")
            symbol: Token symbol (e.g., "WOLF")
            developer: Developer/agent ID
            supply: Total supply (default: 1000000)
            decimals: Decimal places (default: 9)
            
        Returns:
            dict with token info and fees
        """
        data = {
            "name": name,
            "symbol": symbol.upper(),
            "developer": developer,
            "supply": supply,
            "decimals": decimals
        }
        
        return self._request("POST", "/api/tokens/create", data)
    
    def get_token(self, address: str) -> dict:
        """Get token details by address"""
        return self._request("GET", f"/api/tokens/{address}")
    
    def get_all_tokens(self) -> dict:
        """Get all tokens on Kogaion"""
        return self._request("GET", "/api/tokens")
    
    def update_metadata(
        self,
        address: str,
        developer: str,
        description: str = None,
        website: str = None,
        twitter: str = None
    ) -> dict:
        """Update token metadata"""
        metadata = {}
        if description:
            metadata["description"] = description
        if website:
            metadata["website"] = website
        if twitter:
            metadata["twitter"] = twitter
            
        data = {
            "metadata": metadata,
            "developer": developer
        }
        
        return self._request("PUT", f"/api/tokens/{address}", data)
    
    def get_developer_stats(self, developer: str) -> dict:
        """Get developer fee statistics"""
        return self._request("GET", f"/api/tokens/fees/{developer}")


# Convenience function
def create_token(
    name: str,
    symbol: str,
    developer: str,
    supply: int = 1000000,
    decimals: int = 9,
    base_url: str = "http://localhost:3000"
) -> dict:
    """
    Quick token creation function.
    
    Example:
        >>> from kogaion import create_token
        >>> result = create_token(
        ...     name="Wolf Coin",
        ...     symbol="WOLF",
        ...     developer="agent-123"
        ... )
        >>> print(result["token"]["address"])
    """
    launchpad = KogaionTokenLaunchpad(base_url)
    return launchpad.create_token(name, symbol, developer, supply, decimals)


def get_all_tokens(base_url: str = "http://localhost:3000") -> List[dict]:
    """Get all tokens"""
    launchpad = KogaionTokenLaunchpad(base_url)
    return launchpad.get_all_tokens().get("tokens", [])


def get_developer_earnings(developer: str, base_url: str = "http://localhost:3000") -> dict:
    """Get developer fee earnings"""
    launchpad = KogaionTokenLaunchpad(base_url)
    return launchpad.get_developer_stats(developer)


# Example usage
if __name__ == "__main__":
    sdk = KogaionTokenLaunchpad()
    
    # Get fee schedule
    print("💰 Fee Schedule:")
    fees = sdk.get_fee_schedule()
    print(json.dumps(fees, indent=2))
    
    # Create a token (example)
    print("\n🪙 Creating token...")
    result = sdk.create_token(
        name="Wolf Coin",
        symbol="WOLF", 
        developer="example-agent-123",
        supply=1000000
    )
    print(json.dumps(result, indent=2))
    
    # Get all tokens
    print("\n📋 All Tokens:")
    tokens = sdk.get_all_tokens()
    print(json.dumps(tokens, indent=2))
