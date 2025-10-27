# GitHub Actions Setup

This directory contains automated workflows for the Intrdrm project.

## Workflows

### 1. Daily Connection Generation (`daily-generation.yml`)

**Purpose**: Automatically generate 20 connections every day.

**Schedule**: Daily at 2 AM UTC

**Triggers**:
- Scheduled (cron)
- Manual dispatch (with custom count/delay)

**Steps**:
1. Set up Node.js and dependencies
2. Configure Codex authentication
3. Run pre-generation health check
4. Generate connections (default: 20, 10s delay)
5. Run post-generation health check
6. Upload logs as artifacts

---

### 2. Emergency Generation (`emergency-generation.yml`)

**Purpose**: Manually trigger large batch generation when pool is low.

**Triggers**: Manual dispatch only

**Parameters**:
- `count`: Number of connections (default: 50)
- `delay`: Delay between generations (default: 5s)
- `reason`: Documentation for why emergency generation was needed

**Use Cases**:
- Pool critically low (<50 connections)
- High user engagement requires more content
- Recovering from failed daily generation

---

### 3. Health Monitor (`health-monitor.yml`)

**Purpose**: Monitor system health and automatically create/close issues.

**Schedule**: Every 6 hours

**Triggers**:
- Scheduled (every 6 hours)
- Manual dispatch

**Checks**:
- Database connectivity
- Pool size (unrated connections)
- Last generation timestamp
- Concept pool utilization
- Critic score distribution

**Actions**:
- Creates GitHub issue on critical failure
- Sends Slack notifications (if configured)
- Auto-closes issues when health is restored

---

## Required Secrets

Set these in **Settings → Secrets and variables → Actions**:

### Codex CLI Authentication

**`CODEX_AUTH_JSON`**
```bash
# Get your auth.json file
cat ~/.codex/auth.json | pbcopy
# Paste into GitHub secret
```

### Supabase Credentials

**`NEXT_PUBLIC_SUPABASE_URL`**
- Your Supabase project URL
- Example: `https://xxxxx.supabase.co`

**`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
- Your Supabase anonymous/public key
- Found in: Supabase Dashboard → Settings → API

**`SUPABASE_SERVICE_KEY`**
- Your Supabase service role key (admin access)
- Found in: Supabase Dashboard → Settings → API
- **⚠️ KEEP THIS SECRET** - has full database access

### Optional: Slack Notifications

**`SLACK_WEBHOOK_URL`** (optional)
- Webhook URL for Slack notifications
- Set up at: https://api.slack.com/messaging/webhooks
- Receives alerts on health check failures

---

## Setup Instructions

### 1. Add Secrets to GitHub

```bash
# 1. Get Codex auth
cat ~/.codex/auth.json

# 2. Go to GitHub repository:
#    Settings → Secrets and variables → Actions → New repository secret

# 3. Add each secret with exact names above
```

### 2. Verify Codex CLI in Actions

The workflows assume Codex CLI is available. If not in PATH:

```yaml
# Add to workflow before authentication step:
- name: Install Codex CLI
  run: npm install -g @openai/codex-cli
```

### 3. Test Workflows

**Test health check first:**
```bash
# Manually trigger: Actions → Health Monitor → Run workflow
```

**Test single generation:**
```bash
# Manually trigger: Actions → Daily Connection Generation → Run workflow
# Set count=1, delay=5
```

**Full batch after success:**
```bash
# Let it run on schedule OR
# Manually trigger with default settings
```

---

## Monitoring

### View Workflow Runs

**Actions tab** → Select workflow → View runs

Each run shows:
- ✅ Success / ❌ Failure status
- Duration
- Logs for each step
- Uploaded log artifacts

### Download Logs

1. Go to workflow run
2. Scroll to **Artifacts** section
3. Download `generation-logs-XXX.zip`
4. Extract and view detailed logs

### Health Check Issues

Critical health failures automatically create GitHub issues:
- Tagged with `health-check`, `critical`, `automated`
- Include details and troubleshooting steps
- Auto-close when health is restored

---

## Troubleshooting

### Authentication Errors

**Error**: `Codex authentication failed`

**Fix**:
1. Re-generate auth.json locally: `codex login`
2. Update `CODEX_AUTH_JSON` secret
3. Retry workflow

---

### Insufficient Permissions

**Error**: `Failed to store connection: permission denied`

**Fix**:
1. Verify `SUPABASE_SERVICE_KEY` is the **service role key**, not anon key
2. Check Supabase RLS policies allow service role access

---

### Rate Limiting

**Error**: `Too many requests`

**Fix**:
1. Increase `delay` parameter (default: 10s)
2. Reduce `count` parameter
3. Check Codex CLI rate limits

---

### Pool Depletion

**Issue**: Constant low pool warnings

**Fix**:
1. Run emergency generation (50+ connections)
2. Consider expanding concept pool (add more concepts)
3. Increase daily generation count

---

## Cost Analysis

With Codex CLI using ChatGPT subscription:

- **API Costs**: $0 (uses subscription)
- **GitHub Actions**: Free tier includes 2,000 minutes/month
- **Daily usage**: ~20 minutes/day = ~600 minutes/month
- **Total cost**: $0 (well within free tier)

---

## Customization

### Adjust Schedule

Edit `daily-generation.yml`:

```yaml
schedule:
  - cron: '0 14 * * *'  # 2 PM UTC = 9 AM EST
```

Cron syntax: `minute hour day month weekday`

### Adjust Generation Count

Edit workflow or use manual dispatch with custom parameters.

### Add More Workflows

See [GitHub Actions documentation](https://docs.github.com/en/actions) for creating custom workflows.
