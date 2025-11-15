import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { RateLimitRule, RuleType } from '@/lib/db';

// POST /api/tenants/[tenantId]/rules - Create a new rate limit rule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const { rule_type, limit, window_seconds, api_pattern } = body;

    // Validate tenant exists
    const tenantCheck = await query(
      'SELECT id FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
        },
        { status: 404 }
      );
    }

    // Validate input
    const validRuleTypes: RuleType[] = ['GENERAL', 'IP', 'API'];
    
    if (!rule_type || !validRuleTypes.includes(rule_type)) {
      return NextResponse.json(
        {
          success: false,
          error: `rule_type must be one of: ${validRuleTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!limit || typeof limit !== 'number' || limit <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'limit must be a positive number',
        },
        { status: 400 }
      );
    }

    if (!window_seconds || typeof window_seconds !== 'number' || window_seconds <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'window_seconds must be a positive number',
        },
        { status: 400 }
      );
    }

    // For API rules, api_pattern should be provided
    if (rule_type === 'API' && (!api_pattern || typeof api_pattern !== 'string')) {
      return NextResponse.json(
        {
          success: false,
          error: 'api_pattern is required for API rule type',
        },
        { status: 400 }
      );
    }

    // Insert new rule
    const result = await query<RateLimitRule>(
      `INSERT INTO rate_limit_rules (tenant_id, rule_type, "limit", window_seconds, api_pattern)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenantId, rule_type, limit, window_seconds, api_pattern || null]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: 'Rate limit rule created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating rate limit rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create rate limit rule',
      },
      { status: 500 }
    );
  }
}

// GET /api/tenants/[tenantId]/rules - Get all rules for a tenant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    // Validate tenant exists
    const tenantCheck = await query(
      'SELECT id FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
        },
        { status: 404 }
      );
    }

    // Fetch rules for tenant
    const result = await query<RateLimitRule>(
      'SELECT * FROM rate_limit_rules WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching rules:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch rules',
      },
      { status: 500 }
    );
  }
}

