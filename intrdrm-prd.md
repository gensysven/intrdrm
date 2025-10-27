# PRD: Intrdrm - Concept Connection Generator

## Overview

Intrdrm is a personal tool for the 30-day experiment to test whether AI-generated conceptual connections can be engaging enough to rate daily. This is a single-user web application to validate the core loop before building a social platform.

The name "intrdrm" is a portmanteau of "interdisciplinary" and "daydreaming" - reflecting the tool's purpose of exploring unexpected connections between diverse concepts through AI-assisted creative exploration.

## Goals

1. Generate interesting connections between random concept pairs daily
2. Make rating connections quick and enjoyable (<5 minutes/day)
3. Track patterns in what makes connections interesting
4. Validate whether the core loop is sustainable for 30+ days
5. Build foundation for potential multi-user platform

## User Story

**As a solo user**, I want to:
- See 10 AI-generated concept connections each day
- Quickly rate each connection (1-5 stars)
- Add notes about why connections were good/bad
- See my rating history and patterns
- Track my streak and engagement over time
- Iterate on prompts and see improvement

## Core Features

### 1. Concept Database Management
- **Add/Edit Concepts**: Simple interface to maintain a list of concepts (minimum 50 to start)
- **Concept Categories**: Optional tags (Tech, Science, Culture, Philosophy, etc.)
- **Import/Export**: CSV support for bulk editing

### 2. Connection Generation
- **Random Pair Sampling**: Pick 2 random concepts from database
- **AI Generation**: Use Claude API to generate connection based on template prompt
- **Batch Generation**: Generate 50 connections at once
- **Manual Curation**: Review all 50 and select top 10 for daily batch

### 3. Daily Rating Interface
- **Daily Batch**: View today's 10 pre-selected connections
- **Rating System**: 1-5 star rating per connection
- **Quick Notes**: Optional text field for observations
- **Navigation**: Previous/Next through the 10 connections
- **Progress**: Show "3 of 10 rated today"

### 4. History & Analytics
- **Rating Log**: Chronological view of all rated connections
- **Statistics Dashboard**:
  - Total connections rated
  - Average rating
  - Hit rate (% of 4-5 star ratings)
  - Current streak
  - Rating distribution chart
- **Pattern Analysis**: Tag/note patterns in high-rated connections
- **Search/Filter**: Find past connections by concept, rating, or date

### 5. Prompt Engineering
- **Editable Prompt Template**: Modify the system prompt for generation
- **Version History**: Track prompt iterations
- **A/B Comparison**: Generate with multiple prompts, compare results

## Technical Requirements

### Tech Stack
- **Frontend**: React or Next.js (simple SPA)
- **Backend**: Node.js/Express or Next.js API routes
- **Database**: SQLite (simple, local, portable) or PostgreSQL
- **AI**: Anthropic Claude API (Sonnet 4.5 for generation)
- **Hosting**: Local-first (can run on localhost), deploy later if needed

### API Integration
- Anthropic API key stored in environment variables
- Rate limiting awareness (batch generation)
- Error handling for API failures
- Token usage tracking (optional)

### Data Persistence
- All data stored locally
- Export capability for backup
- Ability to reset/start over

## Data Models

### Concept
```javascript
{
  id: string (uuid),
  name: string,
  description: string (optional),
  category: string (optional),
  created_at: timestamp,
  updated_at: timestamp
}
```

### Connection
```javascript
{
  id: string (uuid),
  concept_a_id: string (foreign key),
  concept_b_id: string (foreign key),
  connection_text: string,
  explanation: string,
  generated_at: timestamp,
  prompt_version: string,
  model_used: string,
  status: enum ['generated', 'curated', 'rated'],
  daily_batch_date: date (nullable)
}
```

### Rating
```javascript
{
  id: string (uuid),
  connection_id: string (foreign key),
  rating: integer (1-5),
  notes: string (optional),
  rated_at: timestamp
}
```

### PromptTemplate
```javascript
{
  id: string (uuid),
  version: string,
  template_text: string,
  created_at: timestamp,
  active: boolean
}
```

## UI/UX Requirements

### Layout
- **Clean, minimal design**: Focus on content, not chrome
- **Mobile-responsive**: Should work on phone for rating on the go
- **Dark/Light mode**: Personal preference toggle

### Key Screens

**1. Home/Dashboard**
- Current streak counter (big, prominent)
- "Today's Batch" button (if unrated connections exist)
- Quick stats (total rated, average rating, hit rate)
- Recent activity

**2. Generation Screen**
- "Generate Batch" button
- Progress indicator during generation
- Preview of generated connections
- "Select 10 for today" curation interface
- Drag-to-reorder or checkboxes

**3. Rating Screen**
- Large, readable display of:
  - Concept A
  - Concept B
  - Connection text
  - Explanation
- Star rating component (1-5)
- Optional notes textarea
- "Previous" / "Next" navigation
- Progress: "3 / 10 rated today"
- "Save & Next" button

**4. History Screen**
- Filterable table/list of all rated connections
- Sort by date, rating, concept
- Search functionality
- Click to view full connection details

**5. Analytics Screen**
- Stats dashboard with charts
- Hit rate over time
- Rating distribution
- Most interesting concept pairs
- Patterns in high-rated connections

**6. Settings Screen**
- Concept database management
- Prompt template editor
- API key configuration
- Export/import data
- Reset functionality

## Success Metrics (Personal)

Track these over 30 days:

**Engagement:**
- Days used / 30 (streak)
- Average time per session
- Completion rate (rated all 10 each day)

**Quality:**
- Hit rate (% 4-5 star ratings)
- Trend over time (improving?)
- Notes captured (sign of genuine interest)

**Learning:**
- Prompt iterations tried
- Concept database growth
- Pattern identification in notes

## Implementation Phases

### Phase 1: Core MVP (Week 1)
- [ ] Basic UI with rating interface
- [ ] Concept database CRUD
- [ ] Claude API integration for generation
- [ ] SQLite database setup
- [ ] Simple daily batch workflow

### Phase 2: Usability (Week 2)
- [ ] History and search
- [ ] Basic statistics dashboard
- [ ] Prompt template editor
- [ ] Better UX for rating flow

### Phase 3: Iteration (Week 3-4)
- [ ] Analytics and pattern detection
- [ ] Export/import
- [ ] Mobile optimization
- [ ] Prompt A/B testing

## Future Considerations (Post-MVP)

**If 30-day experiment succeeds:**
- Multi-user support
- Social features (shared ratings)
- L2 "deep dive" workspace
- Public/private connections
- API for external access

**Don't build now:**
- Authentication (single user)
- Real-time features
- Complex social mechanics
- Payment system
- Mobile native apps

## Technical Constraints

- Keep it simple: this is a validation tool, not production software
- Local-first: should work without internet (except API calls)
- Fast builds: prioritize speed of development over perfection
- Easy to modify: expect to change prompts/features frequently

## Open Questions

1. **Generation timing**: Generate daily batch automatically (cron job) or on-demand?
2. **Concept seeding**: Provide starter concept list or make user build from scratch?
3. **Rating granularity**: Is 1-5 stars enough or need additional dimensions?
4. **Offline support**: Should rating work offline and sync later?

## Getting Started

**First run experience:**
1. Enter API key
2. Import starter concept list (50 concepts) or add manually
3. Generate first batch of 50 connections
4. Curate to 10
5. Rate them
6. See results

**Recommended starter concepts:**
```
Tech: neural networks, git, blockchain, vim, recursion, caching, APIs, 
      open source, technical debt, refactoring

Science: evolution, entropy, quantum tunneling, DNA, photosynthesis, 
         mycelium, fractals, phase transitions

Culture: memes, jazz, mythology, storytelling, fashion, language, 
         cuisine, architecture

Philosophy: emergence, epistemology, causality, free will, consciousness,
            ethics, identity, time
```

## Branding Guidelines

### Name Usage
- **Primary**: intrdrm (lowercase)
- **Logo/Header**: INTRDRM (uppercase) or Intrdrm (title case)
- **Pronunciation**: "inter-dream"
- **Description**: "AI-powered conceptual daydreaming"

### Visual Identity
- Minimal, clean aesthetic
- Focus on readability and content
- Subtle references to connection/linking in UI elements
- Color palette: TBD (suggest exploring dream-like, calm colors)

---

## Appendix: Starting Prompt Template

```
You are generating non-obvious conceptual connections between two concepts.

Concept A: {CONCEPT_A}
Concept B: {CONCEPT_B}

Generate a deep, surprising connection between these concepts.

Requirements:
- NOT the obvious surface similarity everyone would think of
- Must be specific and concrete, not vague platitudes
- Should make someone go "whoa, I never thought of it that way"
- Ground the connection in actual properties/behaviors of both concepts
- Avoid generic business-speak or self-help language

Format:
CONNECTION: [One clear sentence stating the surprising connection]
EXPLANATION: [2-3 sentences explaining why this connection is meaningful and non-obvious]

Example quality bar:
Good: "Git branches are like mycelial networks - both use distributed nodes that can fork, merge, and share resources without a central authority, enabling resilient collaboration"
Bad: "Git and mushrooms both grow over time" (too obvious/shallow)
```

---

## Repository Information

- **GitHub**: github.com/intrdrm/intrdrm
- **Domain**: intrdrm.com
- **License**: TBD (suggest MIT for MVP)
- **Initial Commit**: Include this PRD in first commit
