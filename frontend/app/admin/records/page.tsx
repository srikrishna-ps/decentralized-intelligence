"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import AdminSidebar from "@/components/sidebars/AdminSidebar";

export default function AdminRecordsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "admin") router.push("/");
    }, [status, session, router]);

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${backendUrl}/api/admin/records`);
            const data = await res.json();

            if (data.success) {
                setRecords(data.records || []);
            }
        } catch (error) {
            console.error("Failed to fetch records:", error);
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-cyan-600 text-xl">Loading...</div>
            </div>
        );
    }

    if (!session || session.user.role !== "admin") return null;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <AdminSidebar
                currentPath={pathname}
                userName={session.user.name || ""}
                userEmail={session.user.email || ""}
                adminId={session.user.id || ""}
            />

            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Records Overview</h2>
                        <p className="text-gray-600 mt-1">View all medical records in the system</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        {records.length === 0 ? (
                            <div className="text-center py-16">
                                <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">No records found</h4>
                                <p className="text-gray-600">Medical records will appear here once created</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {records.map((record: any) => (
                                    <div key={record.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="text-lg font-semibold text-gray-900">{record.title}</h4>
                                                        <p className="text-base text-gray-600 mt-1">{record.description}</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2" title="Record Type">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <span className="capitalize bg-gray-50 px-2 py-0.5 rounded text-gray-700 border border-gray-200">{record.type?.replace('_', ' ')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2" title="Patient ID">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        <span className="font-mono text-xs text-gray-500">{record.patientId}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2" title="Status">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${record.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                            }`}>{record.status}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2" title="Date">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
