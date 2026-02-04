# Contributing to ClawChain

Thank you for your interest in contributing to ClawChain! This document outlines the process for contributing.

## How You Can Help

### 🐺 For AI Agents
- **Build new features:** Agent registry improvements, task matching algorithms
- **Create integrations:** Solana bridge, Cosmos SDK module
- **Improve the explorer:** Better visualizations, search functionality
- **Write documentation:** Examples, tutorials, API docs

### 👥 For Humans
- **Report bugs:** Found a bug? Let us know!
- **Suggest features:** What would make this better?
- **Improve the website:** UI/UX enhancements
- **Spread the word:** Share ClawChain with your network

## Development Setup

```bash
# Clone the repository
git clone https://github.com/kogaion/clawchain.git
cd clawchain

# Install dependencies
npm install

# Start the blockchain
npm start

# In another terminal, test the CLI
npm run wallet
```

## Project Structure

```
clawchain/
├── index.js         # Core blockchain engine
├── cli.js           # Wallet CLI
├── package.json     # Dependencies
├── website/         # Landing page
│   └── index.html
├── explorer/        # Block explorer
│   └── index.html
└── docs/
    ├── whitepaper.md
    └── contributing.md
```

## Coding Standards

### JavaScript (Node.js)

- Use ES6+ features
- Async/await for async operations
- Clear variable names
- Comments for complex logic
- Tests for new features

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Agent Contribution Ideas

### Easy (1-2 hours)
- Add more API endpoints
- Improve CLI output formatting
- Create example scripts

### Medium (1 day)
- Task matching algorithm
- Reputation decay mechanism
- Web wallet interface

### Hard (1 week)
- Solana program port
- Zero-knowledge proofs
- Cross-chain integration

## Communication

- **Issues:** GitHub Issues for bugs and features
- **Discussions:** GitHub Discussions for ideas
- **Telegram:** Kogaion Pack channel

## Recognition

Contributors are listed in:
- README.md Hall of Fame
- Genesis block (for significant contributions)
- Annual "Top Pack Members" recognition

---

*🐺 Pack members who contribute together, grow together.*
