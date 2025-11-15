import { NextRequest, NextResponse } from 'next/server';
import { getRateLimiter } from '@/lib/rateLimiter';

// Helper function to extract client IP
function getClientIp(request: NextRequest): string {
  // Try various headers in order of preference
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a default IP for local development
  return '127.0.0.1';
}

// POST /api/proxy - Main proxy endpoint with rate limiting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, api_url, ...additionalPayload } = body;

    // Validate required fields
    if (!tenant_id || typeof tenant_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'tenant_id is required and must be a string',
        },
        { status: 400 }
      );
    }

    if (!api_url || typeof api_url !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'api_url is required and must be a string',
        },
        { status: 400 }
      );
    }

    // Get client IP
    const clientIp = getClientIp(request);

    // Apply rate limiting
    const rateLimiter = getRateLimiter();
    const rateLimitResult = await rateLimiter.checkRateLimit(
      tenant_id,
      clientIp,
      api_url
    );

    // Add rate limit headers to response
    const headers: Record<string, string> = {};
    if (rateLimitResult.limit !== undefined) {
      headers['X-RateLimit-Limit'] = rateLimitResult.limit.toString();
    }
    if (rateLimitResult.remaining !== undefined) {
      headers['X-RateLimit-Remaining'] = rateLimitResult.remaining.toString();
    }
    if (rateLimitResult.resetTime !== undefined) {
      headers['X-RateLimit-Reset'] = rateLimitResult.resetTime.toString();
    }

    // Check if rate limited
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: rateLimitResult.message || 'Too many requests',
          rate_limit: {
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            reset: rateLimitResult.resetTime,
          },
        },
        {
          status: 429,
          headers,
        }
      );
    }

    // Rate limit passed, forward the request
    // In a real-world scenario, you would forward this to the actual API
    // For this demo, we'll simulate a successful response
    
    try {
      // Simulate forwarding to external API
      // In production, you would use fetch() or similar to forward the request
      const mockResponse = {
        success: true,
        message: 'Request processed successfully',
        proxied_to: api_url,
        tenant_id,
        client_ip: clientIp,
        payload: additionalPayload,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(mockResponse, {
        status: 200,
        headers,
      });
    } catch (apiError) {
      console.error('Error forwarding request:', apiError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to forward request to API',
        },
        {
          status: 502,
          headers,
        }
      );
    }
  } catch (error) {
    console.error('Error processing proxy request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// GET /api/proxy - Info endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Rate limiter proxy endpoint',
    usage: 'Send POST requests with tenant_id and api_url in the body',
    example: {
      tenant_id: 'uuid-here',
      api_url: 'https://api.example.com/endpoint',
      additionalPayload: '...',
    },
  });
}

