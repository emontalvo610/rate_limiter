'use client';

import { useState, useEffect } from 'react';

interface Tenant {
  id: string;
  name: string;
}

interface TestResult {
  timestamp: string;
  status: number;
  success: boolean;
  message?: string;
  error?: string;
  rateLimitInfo?: {
    limit?: number;
    remaining?: number;
    reset?: number;
  };
  response?: any;
}

export default function TestPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [apiUrl, setApiUrl] = useState('https://api.example.com/test');
  const [payload, setPayload] = useState('{\n  "data": "test"\n}');
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  // Fetch tenants
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await fetch('/api/tenants');
        const data = await response.json();
        if (data.success) {
          setTenants(data.data);
          if (data.data.length > 0) {
            setSelectedTenantId(data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch tenants:', err);
      }
    };

    fetchTenants();
  }, []);

  // Send test request
  const sendRequest = async () => {
    if (!selectedTenantId) {
      alert('Please select a tenant');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      let additionalPayload = {};
      try {
        additionalPayload = JSON.parse(payload);
      } catch {
        additionalPayload = {};
      }

      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: selectedTenantId,
          api_url: apiUrl,
          ...additionalPayload,
        }),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      const result: TestResult = {
        timestamp: new Date().toISOString(),
        status: response.status,
        success: response.ok,
        message: data.message,
        error: data.error,
        response: data,
        rateLimitInfo: {
          limit: response.headers.get('X-RateLimit-Limit')
            ? parseInt(response.headers.get('X-RateLimit-Limit')!, 10)
            : undefined,
          remaining: response.headers.get('X-RateLimit-Remaining')
            ? parseInt(response.headers.get('X-RateLimit-Remaining')!, 10)
            : undefined,
          reset: response.headers.get('X-RateLimit-Reset')
            ? parseInt(response.headers.get('X-RateLimit-Reset')!, 10)
            : undefined,
        },
      };

      setResults((prev) => [result, ...prev].slice(0, 20)); // Keep last 20 results
      setRequestCount((prev) => prev + 1);
    } catch (err) {
      const result: TestResult = {
        timestamp: new Date().toISOString(),
        status: 0,
        success: false,
        error: 'Network error or request failed',
      };
      setResults((prev) => [result, ...prev].slice(0, 20));
    } finally {
      setLoading(false);
    }
  };

  // Send multiple requests
  const sendBulkRequests = async (count: number) => {
    for (let i = 0; i < count; i++) {
      await sendRequest();
      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  // Clear results
  const clearResults = () => {
    setResults([]);
    setRequestCount(0);
  };

  // Get success/error counts
  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;
  const rateLimitedCount = results.filter((r) => r.status === 429).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Rate Limiter Test Page
        </h1>
        <p className="text-gray-600 mb-8">
          Test rate limiting by sending requests to the proxy endpoint
        </p>

        {/* Configuration Panel */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Test Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Tenant
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">Choose a tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                placeholder="https://api.example.com/endpoint"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Payload (JSON)
            </label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-gray-900 placeholder-gray-400"
              rows={4}
              placeholder='{"key": "value"}'
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={sendRequest}
              disabled={loading || !selectedTenantId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>
            <button
              onClick={() => sendBulkRequests(5)}
              disabled={loading || !selectedTenantId}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              Send 5 Requests
            </button>
            <button
              onClick={() => sendBulkRequests(10)}
              disabled={loading || !selectedTenantId}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              Send 10 Requests
            </button>
            <button
              onClick={clearResults}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition"
            >
              Clear Results
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-500 mb-1">Total Requests</div>
            <div className="text-3xl font-bold text-gray-900">{requestCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-500 mb-1">Successful</div>
            <div className="text-3xl font-bold text-green-600">{successCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-500 mb-1">Rate Limited</div>
            <div className="text-3xl font-bold text-red-600">{rateLimitedCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-500 mb-1">Other Errors</div>
            <div className="text-3xl font-bold text-orange-600">
              {errorCount - rateLimitedCount}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Request Results
          </h2>
          
          {results.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No requests sent yet. Click "Send Request" to start testing!
            </p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`border-l-4 rounded-lg p-4 ${
                    result.status === 429
                      ? 'border-red-500 bg-red-50'
                      : result.success
                      ? 'border-green-500 bg-green-50'
                      : 'border-orange-500 bg-orange-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          result.status === 429
                            ? 'bg-red-600 text-white'
                            : result.success
                            ? 'bg-green-600 text-white'
                            : 'bg-orange-600 text-white'
                        }`}
                      >
                        {result.status === 429
                          ? '429 Rate Limited'
                          : result.success
                          ? '200 Success'
                          : `${result.status} Error`}
                      </span>
                      {result.rateLimitInfo?.remaining !== undefined && (
                        <span className="text-sm text-gray-600">
                          Remaining: {result.rateLimitInfo.remaining} /{' '}
                          {result.rateLimitInfo.limit}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {result.error && (
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Error:</strong> {result.error}
                    </p>
                  )}
                  
                  {result.message && (
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Message:</strong> {result.message}
                    </p>
                  )}

                  {result.rateLimitInfo?.reset && (
                    <p className="text-xs text-gray-600">
                      Reset time:{' '}
                      {new Date(result.rateLimitInfo.reset * 1000).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

