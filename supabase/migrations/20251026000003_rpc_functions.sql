-- RPC Functions for Concept Management

/**
 * Increment usage_count for a concept by name.
 * Creates the concept if it doesn't exist (with usage_count = 1).
 */
CREATE OR REPLACE FUNCTION increment_concept_usage(concept_name TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO concepts (name, usage_count)
  VALUES (concept_name, 1)
  ON CONFLICT (name)
  DO UPDATE SET usage_count = concepts.usage_count + 1;
END;
$$ LANGUAGE plpgsql;

/**
 * Get a random concept weighted by inverse usage_count.
 * Concepts with lower usage_count have higher probability of selection.
 */
CREATE OR REPLACE FUNCTION get_fair_random_concept()
RETURNS TABLE(id UUID, name TEXT, usage_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.usage_count
  FROM concepts c
  ORDER BY random() / (c.usage_count + 1) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
