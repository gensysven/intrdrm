-- Indexes for connections
CREATE INDEX idx_connections_status ON connections(status) WHERE status = 'unrated';
CREATE INDEX idx_connections_rated_at ON connections(rated_at) WHERE rated_at IS NOT NULL;
CREATE INDEX idx_connections_concept_a ON connections(concept_a_id);
CREATE INDEX idx_connections_concept_b ON connections(concept_b_id);

-- Indexes for critic_evaluations
CREATE INDEX idx_critic_eval_connection ON critic_evaluations(connection_id);
CREATE INDEX idx_critic_eval_model ON critic_evaluations(critic_model);
CREATE INDEX idx_critic_eval_total ON critic_evaluations(total DESC);

-- Indexes for ratings
CREATE INDEX idx_ratings_connection ON ratings(connection_id);
CREATE INDEX idx_ratings_rating ON ratings(rating);
CREATE INDEX idx_ratings_rated_at ON ratings(rated_at DESC);

-- Indexes for concepts
CREATE INDEX idx_concepts_category ON concepts(category);
CREATE INDEX idx_concepts_usage_count ON concepts(usage_count ASC);
