/**
 * Application-wide constants
 *
 * @see Story 2.4: Add Free Retry Mechanism
 */

/**
 * Maximum number of free retries allowed per prompt/image
 * After this limit, template suggestions are shown
 *
 * @see FR3: Users can regenerate a model with the same prompt (free retry, up to 3x)
 */
export const MAX_RETRIES = 3;
