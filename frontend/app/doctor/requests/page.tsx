"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import DoctorSidebar from "@/components/sidebars/DoctorSidebar";

export default function DoctorRequestsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "doctor") router.push("/");
    }, [status, session, router]);

    useEffect(() => {
        if (session?.user?.providerId) {
            fetchRequests();
        }
    }, [session]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${backendUrl}/api/doctor/access-requests/${session?.user?.providerId}`);
            const data = await res.json();

            if (data.success) {
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error("Failed to fetch requests:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRequests = requests.filter((r: any) => r.status === activeTab);

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-cyan-600 text-xl">Loading...</div>
            </div>
        );
    }

    if (!session || session.user.role !== "doctor") return null;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <DoctorSidebar
                currentPath={pathname}
                userName={session.user.name || ""}
                userEmail={session.user.email || ""}
                doctorId={session.user.providerId || ""}
            />

            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Access Requests</h2>
                        <p className="text-gray-600 mt-2">Track your patient access requests</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'pending'
                                ? 'border-cyan-600 text-cyan-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setActiveTab('approved')}
                            className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'approved'
                                ? 'border-cyan-600 text-cyan-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Approved
                        </button>
                        <button
                            onClick={() => setActiveTab('rejected')}
                            className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'rejected'
                                ? 'border-cyan-600 text-cyan-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Rejected
                        </button>
                    </div>

                    {/* Requests List */}
                    <div className="space-y-4">
                        {filteredRequests.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                <p className="text-gray-500 italic">No {activeTab} requests found.</p>
                            </div>
                        ) : (
                            filteredRequests.map((request: any) => (
                                <div key={request.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="font-semibold text-gray-900 text-lg">Patient: <span className="font-mono text-cyan-600">{request.patientId}</span></p>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${request.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                                    request.status === 'approved' ? 'bg-teal-100 text-teal-800' :
                                                        'bg-pink-100 text-pink-800'
                                                    }`}>
                                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">Requested on: {new Date(request.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
