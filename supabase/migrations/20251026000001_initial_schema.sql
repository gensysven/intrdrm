-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Concepts table
CREATE TABLE concepts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connections table
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  concept_a_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  concept_b_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  connection_text TEXT NOT NULL,
  explanation TEXT NOT NULL,

  -- Metadata
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  prompt_version TEXT DEFAULT 'v1.0',
  model_used TEXT DEFAULT 'gpt-4',

  -- Status
  status TEXT NOT NULL DEFAULT 'unrated' CHECK (status IN ('unrated', 'rated')),
  rated_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT unique_concept_pair UNIQUE (concept_a_id, concept_b_id),
  CONSTRAINT different_concepts CHECK (concept_a_id != concept_b_id)
);

-- Critic Evaluations table
CREATE TABLE critic_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  critic_model TEXT NOT NULL CHECK (critic_model IN ('gpt-4-run-1', 'gpt-4-run-2')),

  -- Scores
  novelty INTEGER NOT NULL CHECK (novelty >= 1 AND novelty <= 10),
  coherence INTEGER NOT NULL CHECK (coherence >= 1 AND coherence <= 10),
  usefulness INTEGER NOT NULL CHECK (usefulness >= 1 AND usefulness <= 10),
  total INTEGER GENERATED ALWAYS AS (novelty + coherence + usefulness) STORED,

  -- Metadata
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Correlation tracking (populated by analytics)
  correlation_with_ratings FLOAT,

  -- Constraints
  CONSTRAINT unique_critic_per_connection UNIQUE (connection_id, critic_model)
);

-- Ratings table
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('bad', 'good', 'wow')),
  notes TEXT,
  rated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: only one rating per connection
  CONSTRAINT unique_rating_per_connection UNIQUE (connection_id)
);

-- Prompt Templates table
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT NOT NULL UNIQUE,
  template_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT false
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for concepts table
CREATE TRIGGER update_concepts_updated_at
    BEFORE UPDATE ON concepts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
