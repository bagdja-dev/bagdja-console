'use client';

import { useState, useEffect } from 'react';
import { getInfraContracts } from '@/lib/api';
import { Activity, Shield, CheckCircle, XCircle, Globe, Lock, Code } from 'lucide-react';

export default function InfraEventsPage() {
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchContracts() {
            try {
                setLoading(true);
                const data = await getInfraContracts();
                setContracts(data);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch event contracts');
            } finally {
                setLoading(false);
            }
        }
        fetchContracts();
    }, []);

    if (loading) return <div className="p-8 text-center">Loading event contracts...</div>;
    if (error) return <div className="p-8 text-red-500 bg-red-50 rounded-lg m-4">{error}</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <Activity className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Event Registry</h1>
                    <p className="text-gray-500">Monitor and manage all system-wide event contracts</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {contracts.map((contract) => (
                    <div key={contract.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <Code className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{contract.eventName}</h3>
                                    <p className="text-xs text-gray-500">Publisher: {contract.app?.appId}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {contract.isPublic ? (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                        <Globe className="w-3 h-3" /> Public
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                        <Lock className="w-3 h-3" /> Private
                                    </span>
                                )}
                                {contract.isActive ? (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                        <CheckCircle className="w-3 h-3" /> Active
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                        <XCircle className="w-3 h-3" /> Inactive
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-900 rounded-xl p-4 overflow-hidden">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">JSON Schema</span>
                            </div>
                            <pre className="text-xs text-green-400 font-mono overflow-x-auto max-h-40">
                                {JSON.stringify(contract.schema, null, 2)}
                            </pre>
                        </div>
                    </div>
                ))}

                {contracts.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No event contracts found</h3>
                        <p className="text-gray-500">Event publishers will register their contracts here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
