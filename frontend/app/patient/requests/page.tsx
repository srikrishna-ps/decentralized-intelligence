"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import PatientSidebar from "@/components/sidebars/PatientSidebar";

export default function PatientRequestsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "patient") router.push("/");
    }, [status, session, router]);

    useEffect(() => {
        if (session?.user?.patientId) {
            fetchRequests();
        }
    }, [session]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${backendUrl}/api/patient/incoming-requests/${session?.user?.patientId}`);
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

    const handleApprove = async (requestId: string) => {
        try {
            const res = await fetch(`${backendUrl}/api/patient/approve-request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId,
                    patientId: session?.user?.patientId
                }),
            });

            const data = await res.json();

            if (data.success) {
                alert("Access request approved!");
                fetchRequests();
            } else {
                alert(data.error || "Failed to approve request");
            }
        } catch (error: any) {
            console.error("Approve error:", error);
            alert("Failed to approve request");
        }
    };

    const handleReject = async (requestId: string) => {
        try {
            const res = await fetch(`${backendUrl}/api/patient/reject-request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId,
                    patientId: session?.user?.patientId
                }),
            });

            const data = await res.json();

            if (data.success) {
                alert("Access request rejected");
                fetchRequests();
            } else {
                alert(data.error || "Failed to reject request");
            }
        } catch (error: any) {
            console.error("Reject error:", error);
            alert("Failed to reject request");
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-cyan-600 text-xl">Loading...</div>
            </div>
        );
    }

    if (!session || session.user.role !== "patient") return null;

    const pendingRequests = requests.filter((r: any) => r.status === 'pending');
    const approvedRequests = requests.filter((r: any) => r.status === 'approved');
    const rejectedRequests = requests.filter((r: any) => r.status === 'rejected');

    const currentRequests = activeTab === 'pending' ? pendingRequests :
        activeTab === 'approved' ? approvedRequests :
            rejectedRequests;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Reusable Sidebar */}
            <PatientSidebar
                currentPath={pathname}
                userName={session.user.name || ""}
                userEmail={session.user.email || ""}
                patientId={session.user.patientId || ""}
            />

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Access Requests</h2>
                        <p className="text-gray-600 mt-1">Manage incoming access requests from healthcare providers</p>
                    </div>

                    {/* Tabs */}
                    <div className="mb-6 border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`py-4 px-1 border-b-2 font-medium ${activeTab === 'pending'
                                    ? 'border-cyan-600 text-cyan-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Pending ({pendingRequests.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('approved')}
                                className={`py-4 px-1 border-b-2 font-medium ${activeTab === 'approved'
                                    ? 'border-cyan-600 text-cyan-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Approved ({approvedRequests.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('rejected')}
                                className={`py-4 px-1 border-b-2 font-medium ${activeTab === 'rejected'
                                    ? 'border-cyan-600 text-cyan-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Rejected ({rejectedRequests.length})
                            </button>
                        </nav>
                    </div>

                    {/* Requests List */}
                    {currentRequests.length > 0 ? (
                        <div className="space-y-4">
                            {currentRequests.map((request: any) => (
                                <div key={request.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${activeTab === 'rejected' ? 'opacity-75' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-sm font-medium">
                                                    {request.requesterRole}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${activeTab === 'pending' ? 'bg-cyan-100 text-cyan-800' :
                                                    activeTab === 'approved' ? 'bg-cyan-200 text-cyan-900' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {activeTab === 'pending' ? 'Pending' : activeTab === 'approved' ? 'Approved' : 'Rejected'}
                                                </span>
                                            </div>
                                            <h4 className="text-lg font-semibold text-gray-900">{request.requesterName || request.requesterId}</h4>
                                            <div className="flex justify-between items-center mt-2">
                                                <p className="text-base text-gray-600"><span className="font-semibold">Reason:</span> {request.reason}</p>
                                                <p className="text-sm text-gray-500">
                                                    {activeTab === 'pending' && `Requested: ${new Date(request.requestedAt).toLocaleString()}`}
                                                    {activeTab === 'approved' && `Approved: ${new Date(request.approvedAt).toLocaleString()}`}
                                                    {activeTab === 'rejected' && `Rejected: ${new Date(request.rejectedAt).toLocaleString()}`}
                                                </p>
                                            </div>
                                        </div>
                                        {activeTab === 'pending' && (
                                            <div className="flex gap-3 ml-4">
                                                <button
                                                    onClick={() => handleApprove(request.id)}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleReject(request.id)}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">No {activeTab} requests</h4>
                            <p className="text-gray-600">
                                {activeTab === 'pending' && 'No pending access requests at this time'}
                                {activeTab === 'approved' && 'No approved access requests'}
                                {activeTab === 'rejected' && 'No rejected access requests'}
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
