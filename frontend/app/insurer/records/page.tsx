"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import InsurerSidebar from "@/components/sidebars/InsurerSidebar";

export default function InsurerRecordsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "insurer") router.push("/");
    }, [status, session, router]);

    useEffect(() => {
        if (session?.user?.providerId) {
            fetchRecords();
        }
    }, [session]);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${backendUrl}/api/insurer/granted-records/${session?.user?.providerId}`);
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

    if (!session || session.user.role !== "insurer") return null;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Reusable Sidebar */}
            <InsurerSidebar
                currentPath={pathname}
                userName={session.user.name || ""}
                userEmail={session.user.email || ""}
                insurerId={session.user.providerId || ""}
            />

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Granted Records</h2>
                        <p className="text-gray-600 mt-1">View patient records you have been granted access to</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        {records.length === 0 ? (
                            <div className="text-center py-16">
                                <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">No records available</h4>
                                <p className="text-gray-600">Request access to patient records to view them here</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {records.map((record: any) => (
                                    <div key={record.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h4 className="text-lg font-semibold text-gray-900">{record.title}</h4>
                                                <p className="text-base text-gray-600 mt-2">{record.description}</p>
                                                <div className="flex gap-4 mt-3 text-sm text-gray-600">
                                                    <span><span className="font-semibold">Type:</span> {record.type?.replace('_', ' ')}</span>
                                                    <span><span className="font-semibold">Patient:</span> {record.patientId}</span>
                                                    <span><span className="font-semibold">Date:</span> {new Date(record.createdAt).toLocaleDateString()}</span>
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
