/**
 * 🪙 Kogaion Token Launchpad
 * 
 * Agents can launch tokens on Kogaion.
 * Developers earn fees from token creation.
 */

import crypto from 'crypto-js';

// Token storage
const tokens = new Map();
const tokenFees = new Map();

// Fee structure (in credits)
const FEES = {
  create: 50,      // Credits to create token
  update: 10,      // Credits to update metadata
  burn: 5          // Credits to burn tokens
};

// Developer fee share (80% to developer, 20% platform)
const DEVELOPER_FEE_SHARE = 0.80;

// Generate token address
function generateTokenAddress(name, symbol) {
  const data = `${name}-${symbol}-${Date.now()}`;
  return crypto.SHA256(data).toString().substring(0, 44) + ' TOKEN';
}

// Calculate fees for developer
function calculateDeveloperFee(feeType) {
  const baseFee = FEES[feeType] || 10;
  return Math.floor(baseFee * DEVELOPER_FEE_SHARE);
}

// Create new token
export function createToken(data) {
  const { name, symbol, decimals = 9, supply = 1000000, developer } = data;
  
  // Validate
  if (!name || !symbol || !developer) {
    throw new Error('Missing required fields: name, symbol, developer');
  }
  
  // Generate token address
  const address = generateTokenAddress(name, symbol);
  
  // Calculate fees
  const totalFee = FEES.create;
  const developerFee = calculateDeveloperFee('create');
  
  // Create token record
  const token = {
    address,
    name,
    symbol,
    decimals,
    supply,
    creator: developer,
    createdAt: new Date().toISOString(),
    status: 'active',
    totalFees: developerFee,
    metadata: {
      description: '',
      website: '',
      twitter: ''
    }
  };
  
  // Store token
  tokens.set(address, token);
  
  // Track fees for developer
  if (!tokenFees.has(developer)) {
    tokenFees.set(developer, { total: 0, count: 0, tokens: [] });
  }
  const devStats = tokenFees.get(developer);
  devStats.total += developerFee;
  devStats.count++;
  devStats.tokens.push(address);
  
  return {
    success: true,
    token,
    fees: {
      total: totalFee,
      developer: developerFee,
      platform: totalFee - developerFee
    }
  };
}

// Get token by address
export function getToken(address) {
  return tokens.get(address) || null;
}

// Get all tokens
export function getAllTokens() {
  return Array.from(tokens.values());
}

// Get developer fee stats
export function getDeveloperStats(developer) {
  return tokenFees.get(developer) || { total: 0, count: 0, tokens: [] };
}

// Update token metadata
export function updateMetadata(address, metadata, developer) {
  const token = tokens.get(address);
  
  if (!token) {
    throw new Error('Token not found');
  }
  
  if (token.creator !== developer) {
    throw new Error('Only creator can update metadata');
  }
  
  // Update metadata
  token.metadata = { ...token.metadata, ...metadata };
  tokens.set(address, token);
  
  return { success: true, token };
}

// Get fee schedule
export function getFeeSchedule() {
  return {
    create: FEES.create,
    update: FEES.update,
    burn: FEES.burn,
    developerShare: `${DEVELOPER_FEE_SHARE * 100}%`,
    developerStatsEndpoint: '/api/tokens/fees/:developer'
  };
}

// Export for use
export default {
  createToken,
  getToken,
  getAllTokens,
  getDeveloperStats,
  updateMetadata,
  getFeeSchedule
};
