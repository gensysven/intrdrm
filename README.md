# Intrdrm - AI-Powered Conceptual Daydreaming

An experimental tool that generates surprising conceptual connections between unrelated ideas, using AI to create daily "conceptual daydreams" that you can rate and explore.

## 🎯 What It Does

- **Generates** 20 conceptual connections daily between random concept pairs
- **Evaluates** each connection with dual AI critics (generous + strict perspectives)
- **Presents** connections in a clean web interface for you to rate
- **Learns** from your ratings to understand what connections you find valuable
- **Runs** completely automated via GitHub Actions

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Supabase account (free tier is fine)
- **One** of the following (pick your favorite):
  - ChatGPT Plus subscription (for Codex CLI) - **FREE** ✨
  - Claude Pro/Max subscription (for Claude Code) - **FREE** ✨
  - Anthropic API key (for Claude Code API) - **~$0.48/day**

### 1. Clone and Install

```bash
git clone https://github.com/gensysven/intrdrm.git
cd intrdrm
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migrations in order:
   ```bash
   npm run setup:database
   ```
   This will display the SQL to copy/paste into Supabase SQL Editor.

3. Run all three migrations:
   - `20251026000001_initial_schema.sql`
   - `20251026000002_indexes.sql`
   - `20251026000003_rpc_functions.sql`

### 3. Configure Environment

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# AI Generation (pick ONE option below)
USE_CLAUDE=false  # Use Codex by default

# Optional: For Claude Code API (if USE_CLAUDE=true and using paid API)
# ANTHROPIC_API_KEY=your-api-key

# Optional: Slack notifications
# SLACK_WEBHOOK_URL=your-slack-webhook
```

### 4. Choose Your AI Provider

You have **three zero-cost options**:

#### Option 1: Codex CLI (ChatGPT Plus) - DEFAULT

```bash
# Install Codex CLI (if not already installed)
npm install -g codex-cli

# Authenticate
codex login

# Verify
codex --version
```

**Cost:** $0 (uses your ChatGPT Plus subscription)

#### Option 2: Claude Code (Claude Pro/Max)

```bash
# Install Claude Code
npm install -g @anthropic/claude-code

# Generate OAuth token
claude setup-token

# Set in .env.local
USE_CLAUDE=true
```

**Cost:** $0 (uses your Claude Pro/Max subscription)

#### Option 3: Claude Code API (Pay-as-you-go)

```bash
# Get API key from console.anthropic.com
# Add to .env.local
USE_CLAUDE=true
ANTHROPIC_API_KEY=sk-ant-...
```

**Cost:** ~$0.024 per connection (~$0.48/day for 20 connections)

### 5. Seed Concepts

```bash
npm run seed:concepts
```

This adds 150+ diverse concepts to your database.

### 6. Generate Your First Connection

```bash
npm run generate
```

This will:
1. Select a random concept pair
2. Generate a connection
3. Score it with dual critics
4. Store in database

### 7. Run the Web App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your connections and start rating!

---

## 🤖 GitHub Actions Automation

### Setup for Automated Daily Generation

1. **Add GitHub Secrets** (Settings → Secrets → Actions):

   ```
   CODEX_AUTH_JSON          # Copy from ~/.codex/auth.json
   # OR
   CLAUDE_CODE_OAUTH_TOKEN  # From: claude setup-token
   # OR
   ANTHROPIC_API_KEY        # From: console.anthropic.com

   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_KEY
   SLACK_WEBHOOK_URL        # Optional
   ```

2. **Enable Workflows**

   The workflows are ready to go! They will:
   - Generate 20 connections daily at 2 AM UTC
   - Run health checks every 6 hours
   - Create GitHub issues if critical problems detected
   - Send Slack notifications (if configured)
   - **NEW**: Respond to @claude mentions in issues/PRs
   - **NEW**: Automatically review all PRs

3. **Manual Triggers**

   - **Daily Generation**: Actions → Daily Connection Generation → Run workflow
   - **Emergency**: Actions → Emergency Generation → Run workflow (50+ connections)
   - **Health Check**: Actions → Health Monitor → Run workflow

4. **Interactive Claude**

   Mention `@claude` in any issue or PR comment to get AI assistance:
   ```
   @claude Can you explain how the dual-critic system works?
   @claude Please review this code for potential bugs
   @claude Add error handling to the connection generation script
   ```

5. **Automatic PR Reviews**

   Every PR automatically gets reviewed by Claude for:
   - Code quality and best practices
   - Potential bugs and issues
   - Performance considerations
   - Security concerns
   - Test coverage

### Cost Analysis

All five workflows combined:
- **Codex/Claude subscription**: $0/month
- **GitHub Actions**: Free tier (2,000 min/month, we use ~600)
- **Supabase**: Free tier (500MB, plenty for this)
- **Total**: **$0/month** ✨

---

## 📁 Project Structure

```
intrdrm/
├── app/                          # Next.js app
│   ├── components/
│   │   ├── Dashboard.tsx         # Stats display
│   │   └── ConnectionBrowser.tsx # Rating interface
│   └── page.tsx                  # Main page
├── lib/
│   └── supabase/                 # Supabase clients + types
├── scripts/
│   ├── lib/
│   │   ├── concept-pairs.ts      # Fair sampling
│   │   ├── prompts.ts            # Template loading
│   │   ├── cli-wrapper.ts        # Unified AI interface
│   │   └── claude-wrapper.ts     # Claude Code support
│   ├── generate-single-connection.ts  # Core generation
│   ├── generate-batch.sh         # Batch processing
│   ├── health-check.ts           # System monitoring
│   └── seed-concepts.ts          # Initial data
├── prompts/
│   ├── generator-v1.md           # Connection prompt
│   ├── critic-run-1.md           # Generous critic
│   └── critic-run-2.md           # Strict critic
├── supabase/migrations/          # Database schema
└── .github/workflows/            # Automation
    ├── daily-generation.yml      # Scheduled generation
    ├── emergency-generation.yml  # Manual bulk generation
    ├── health-monitor.yml        # System health checks
    ├── claude.yml                # Interactive @claude responses
    └── claude-code-review.yml    # Automatic PR reviews
```

---

## 🛠️ Available Scripts

### Generation

```bash
npm run generate              # Generate 1 connection
npm run generate:batch        # Generate 20 connections (default)
./scripts/generate-batch.sh 50 5  # 50 connections, 5s delay
```

### Testing

```bash
npm run test:prompts          # Verify prompt templates
npm run test:concept-pairs    # Test pair selection
npm run test:codex            # Test AI CLI (Codex or Claude)
```

### Monitoring

```bash
npm run health-check          # Check system health
```

### Database

```bash
npm run setup:database        # Display migration SQL
npm run seed:concepts         # Add initial concepts
```

---

## 🎨 Rating System

**Trinary Scale:**
- 👎 **Bad**: Obvious, nonsensical, or boring
- 👍 **Good**: Interesting and coherent
- 🤩 **Wow**: Genuinely surprising and valuable

Your ratings help understand what makes connections valuable to you.

---

## 📊 Dual-Critic System

Each connection is scored by two AI critics:

**Critic Run 1 (Generous):**
- More optimistic
- Rewards creativity
- Temperature: 0.7

**Critic Run 2 (Strict):**
- More skeptical
- Demands rigor
- Temperature: 0.5

Scores: Novelty, Coherence, Usefulness (1-10 each)

This provides variance and helps identify truly exceptional connections.

---

## 🔧 Configuration

### Switching AI Providers

Edit `.env.local`:

```bash
# Use Codex (free)
USE_CLAUDE=false

# Use Claude Code (free with subscription or paid with API)
USE_CLAUDE=true
ANTHROPIC_API_KEY=sk-ant-...  # Only if using API
```

### Adjusting Generation Schedule

Edit `.github/workflows/daily-generation.yml`:

```yaml
schedule:
  - cron: '0 14 * * *'  # 2 PM UTC
```

### Changing Pool Size

Default: 20 connections/day to maintain ~200 unrated pool

To change:
```bash
# Via workflow dispatch
Actions → Daily Generation → count: 30

# Or edit workflow default
```

---

## 🐛 Troubleshooting

### "No connections found"

Run generation manually:
```bash
npm run generate
```

### "Database error"

1. Check `.env.local` credentials
2. Verify migrations were run
3. Check Supabase dashboard logs

### "Codex/Claude authentication failed"

**Codex:**
```bash
codex login
cat ~/.codex/auth.json  # Verify it exists
```

**Claude:**
```bash
claude setup-token
# Copy token to GitHub secrets
```

### Health check failing

```bash
npm run health-check
# Check specific failures and address
```

---

## 🎯 Next Steps

After completing the MVP:

1. **Add Concepts**: Expand the concept pool beyond 150
2. **Analytics Dashboard**: Visualize rating patterns over time
3. **Critic Learning**: Tune prompts based on rating correlation
4. **Export**: Download your favorite connections
5. **Sharing**: Share interesting connections on social media

---

## 📝 Architecture Decisions

### Why Codex-Only Option?

Original plan used Codex for generation + Claude for critics. Switched to Codex-only (with optional Claude) to:
- **Achieve true zero-cost** using subscription
- **Simplify authentication** (one CLI, one auth file)
- **Faster implementation** (fewer moving parts)

Trade-off: Single model perspective instead of model diversity. Mitigated with temperature variance.

### Why Replenishing Pool?

Instead of rating fixed daily batches:
- **Flexible rating** - rate as many or few as you want
- **Constant freshness** - always have new connections
- **Better UX** - no "catch up" pressure

### Why Trinary Rating?

- **Faster** than 1-5 stars
- **Clearer** semantics (bad/good/wow vs. 3/4/5)
- **Sufficient** for learning preferences

---

## 📄 License

MIT License - See LICENSE file

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/), [Supabase](https://supabase.com/), and [Tailwind CSS](https://tailwindcss.com/)
- AI powered by [OpenAI Codex](https://openai.com/codex) and/or [Anthropic Claude](https://www.anthropic.com/)
- Inspired by the idea of computational serendipity

---

## 🤝 Contributing

This is an experimental personal project. Feel free to fork and adapt for your own conceptual daydreaming experiments!

---

**Made with Claude Code** 🤖
