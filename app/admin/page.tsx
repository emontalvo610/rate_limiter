'use client';

import { useState, useEffect } from 'react';

interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

interface RateLimitRule {
  id: string;
  tenant_id: string;
  rule_type: 'GENERAL' | 'IP' | 'API';
  limit: number;
  window_seconds: number;
  api_pattern: string | null;
  created_at: string;
}

interface TenantWithRules extends Tenant {
  rules: RateLimitRule[];
}

export default function AdminPage() {
  const [tenants, setTenants] = useState<TenantWithRules[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tenant form
  const [tenantName, setTenantName] = useState('');

  // Rule form
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [ruleType, setRuleType] = useState<'GENERAL' | 'IP' | 'API'>('GENERAL');
  const [limit, setLimit] = useState('10');
  const [windowSeconds, setWindowSeconds] = useState('60');
  const [apiPattern, setApiPattern] = useState('');

  // Fetch tenants
  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/tenants');
      const data = await response.json();
      if (data.success) {
        setTenants(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch tenants');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // Create tenant
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: tenantName }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Tenant "${tenantName}" created successfully!`);
        setTenantName('');
        fetchTenants();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create tenant');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create rule
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!selectedTenantId) {
      setError('Please select a tenant');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/tenants/${selectedTenantId}/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rule_type: ruleType,
          limit: parseInt(limit, 10),
          window_seconds: parseInt(windowSeconds, 10),
          api_pattern: ruleType === 'API' ? apiPattern : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Rule created successfully!`);
        setApiPattern('');
        fetchTenants();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create rule');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Rate Limiter Admin
        </h1>
        <p className="text-gray-600 mb-8">
          Manage tenants and configure rate limiting rules
        </p>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Create Tenant Form */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Register Tenant
            </h2>
            <form onSubmit={handleCreateTenant}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenant Name
                </label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="Enter tenant name"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Tenant'}
              </button>
            </form>
          </div>

          {/* Create Rule Form */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Configure Rate Limit Rule
            </h2>
            <form onSubmit={handleCreateRule}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tenant
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                >
                  <option value="">Choose a tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rule Type
                </label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="GENERAL">General (Global)</option>
                  <option value="IP">By IP Address</option>
                  <option value="API">By API Endpoint</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Request Limit
                  </label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Window (seconds)
                  </label>
                  <input
                    type="number"
                    value={windowSeconds}
                    onChange={(e) => setWindowSeconds(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    min="1"
                    required
                  />
                </div>
              </div>

              {ruleType === 'API' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Pattern (supports * wildcard)
                  </label>
                  <input
                    type="text"
                    value={apiPattern}
                    onChange={(e) => setApiPattern(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    placeholder="e.g. /api/users/* or https://api.example.com/*"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Rule'}
              </button>
            </form>
          </div>
        </div>

        {/* Tenants and Rules List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Tenants & Rules
          </h2>
          {tenants.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No tenants registered yet. Create one above!
            </p>
          ) : (
            <div className="space-y-6">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {tenant.name}
                    </h3>
                    <span className="text-xs text-gray-500 font-mono">
                      ID: {tenant.id}
                    </span>
                  </div>

                  {tenant.rules.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">
                      No rules configured
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Type
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Limit
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Window
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Pattern
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tenant.rules.map((rule) => (
                            <tr key={rule.id}>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded ${
                                    rule.rule_type === 'GENERAL'
                                      ? 'bg-blue-100 text-blue-800'
                                      : rule.rule_type === 'IP'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-orange-100 text-orange-800'
                                  }`}
                                >
                                  {rule.rule_type}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-700">
                                {rule.limit} requests
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-700">
                                {rule.window_seconds}s
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-700">
                                {rule.api_pattern || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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

