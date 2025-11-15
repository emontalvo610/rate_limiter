import { query } from './db';
import { incrementCounter } from './redis';
import type { RateLimitRule, RuleType } from './db';

export interface RateLimitResult {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  resetTime?: number;
  message?: string;
}

export class RateLimiter {
  private rulesCache: Map<string, RateLimitRule[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Load rate limit rules for a tenant from database with caching
   */
  private async loadRulesForTenant(tenantId: string): Promise<RateLimitRule[]> {
    const now = Date.now();
    const cacheKey = tenantId;

    // Check if cache is valid
    const expiry = this.cacheExpiry.get(cacheKey);
    if (expiry && expiry > now && this.rulesCache.has(cacheKey)) {
      return this.rulesCache.get(cacheKey)!;
    }

    // Fetch from database
    const result = await query<RateLimitRule>(
      'SELECT * FROM rate_limit_rules WHERE tenant_id = $1',
      [tenantId]
    );

    const rules = result.rows;
    
    // Update cache
    this.rulesCache.set(cacheKey, rules);
    this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);

    return rules;
  }

  /**
   * Get current time window for fixed window algorithm
   */
  private getCurrentWindow(windowSeconds: number): number {
    return Math.floor(Date.now() / 1000 / windowSeconds);
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(
    tenantId: string,
    ipAddress: string,
    apiUrl?: string
  ): Promise<RateLimitResult> {
    try {
      // Load rules for tenant
      const rules = await this.loadRulesForTenant(tenantId);

      if (rules.length === 0) {
        // No rules defined, allow by default
        return { allowed: true };
      }

      // Check each rule type sequentially: GENERAL → IP → API
      const ruleTypes: RuleType[] = ['GENERAL', 'IP', 'API'];

      for (const ruleType of ruleTypes) {
        const applicableRules = rules.filter((rule) => rule.rule_type === ruleType);

        for (const rule of applicableRules) {
          // Skip API rules if no API URL provided
          if (rule.rule_type === 'API' && !apiUrl) {
            continue;
          }

          // For API rules, check if pattern matches
          if (rule.rule_type === 'API' && rule.api_pattern) {
            if (!this.matchesPattern(apiUrl!, rule.api_pattern)) {
              continue;
            }
          }

          // Check this rule
          const result = await this.checkRule(rule, tenantId, ipAddress, apiUrl);
          
          if (!result.allowed) {
            // Rate limit hit, deny immediately
            return result;
          }
        }
      }

      // All rules passed, allow request
      return { allowed: true };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // On error, fail open (allow request) to prevent service disruption
      return { allowed: true, message: 'Rate limiter error, allowing request' };
    }
  }

  /**
   * Check a specific rule
   */
  private async checkRule(
    rule: RateLimitRule,
    tenantId: string,
    ipAddress: string,
    apiUrl?: string
  ): Promise<RateLimitResult> {
    const window = this.getCurrentWindow(rule.window_seconds);
    
    // Build Redis key based on rule type
    let identifier: string;
    switch (rule.rule_type) {
      case 'GENERAL':
        identifier = 'general';
        break;
      case 'IP':
        identifier = ipAddress;
        break;
      case 'API':
        identifier = apiUrl || 'unknown';
        break;
      default:
        identifier = 'unknown';
    }

    const redisKey = `rate_limit:${tenantId}:${rule.rule_type}:${identifier}:${window}`;

    // Increment counter in Redis
    const count = await incrementCounter(redisKey, rule.window_seconds);

    const allowed = count <= rule.limit;
    const remaining = Math.max(0, rule.limit - count);
    const resetTime = (window + 1) * rule.window_seconds;

    if (!allowed) {
      return {
        allowed: false,
        limit: rule.limit,
        remaining,
        resetTime,
        message: `Rate limit exceeded for ${rule.rule_type} rule. Limit: ${rule.limit} requests per ${rule.window_seconds}s`,
      };
    }

    return {
      allowed: true,
      limit: rule.limit,
      remaining,
      resetTime,
    };
  }

  /**
   * Simple pattern matching for API patterns
   * Supports wildcards: * (matches any string)
   */
  private matchesPattern(url: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\*/g, '.*'); // Replace * with .*

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(url);
  }

  /**
   * Clear the rules cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.rulesCache.clear();
    this.cacheExpiry.clear();
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

