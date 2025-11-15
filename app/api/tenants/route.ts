import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Tenant, TenantWithRules, RateLimitRule } from '@/lib/db';

// GET /api/tenants - List all tenants with their rules
export async function GET() {
  try {
    // Fetch all tenants
    const tenantsResult = await query<Tenant>(
      'SELECT * FROM tenants ORDER BY created_at DESC'
    );

    // Fetch all rules
    const rulesResult = await query<RateLimitRule>(
      'SELECT * FROM rate_limit_rules ORDER BY created_at DESC'
    );

    // Combine tenants with their rules
    const tenantsWithRules: TenantWithRules[] = tenantsResult.rows.map((tenant) => ({
      ...tenant,
      rules: rulesResult.rows.filter((rule) => rule.tenant_id === tenant.id),
    }));

    return NextResponse.json({
      success: true,
      data: tenantsWithRules,
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tenants',
      },
      { status: 500 }
    );
  }
}

// POST /api/tenants - Create a new tenant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant name is required and must be a non-empty string',
        },
        { status: 400 }
      );
    }

    // Check if tenant with same name already exists
    const existingTenant = await query<Tenant>(
      'SELECT * FROM tenants WHERE name = $1',
      [name.trim()]
    );

    if (existingTenant.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant with this name already exists',
        },
        { status: 409 }
      );
    }

    // Insert new tenant
    const result = await query<Tenant>(
      'INSERT INTO tenants (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: 'Tenant created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create tenant',
      },
      { status: 500 }
    );
  }
}

