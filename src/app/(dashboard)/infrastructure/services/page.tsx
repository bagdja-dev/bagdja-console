'use client';

import { useState, useEffect } from 'react';
import { getInfraApps } from '@/lib/api';
import { Server, Activity, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function InfraServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        setLoading(true);
        const data = await getInfraApps();
        setServices(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch core services');
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading core services...</div>;
  if (error) return <div className="p-8 text-red-500 bg-red-50 rounded-lg m-4">{error}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Server className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Core Services</h1>
          <p className="text-gray-500">Manage Bagdja infrastructure components</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <div key={service.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Shield className="w-6 h-6 text-gray-400" />
              </div>
              {service.isActive ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                  <CheckCircle className="w-3 h-3" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full">
                  <XCircle className="w-3 h-3" /> Inactive
                </span>
              )}
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-1">{service.appId}</h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">
              Organization: <span className="font-medium text-gray-700">{service.orgSlug}</span>
            </p>

            <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Added: {new Date(service.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}

        {services.length === 0 && (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Server className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No core services found</h3>
            <p className="text-gray-500">Register core services in the event hub registry first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
