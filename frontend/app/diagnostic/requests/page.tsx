"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import DiagnosticSidebar from "@/components/sidebars/DiagnosticSidebar";

export default function DiagnosticRequestsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [patientId, setPatientId] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "diagnostic") router.push("/");
    }, [status, session, router]);

    useEffect(() => {
        if (session?.user?.providerId) {
            fetchRequests();
        }
    }, [session]);

    const fetchRequests = async () => {
        try {
            const res = await fetch(`${backendUrl}/api/diagnostic/access-requests/${session?.user?.providerId}`);
            const data = await res.json();

            if (data.success) {
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error("Failed to fetch requests:", error);
        }
    };

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/diagnostic/request-access`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    diagnosticId: session?.user?.providerId,
                    patientId,
                    reason
                }),
            });

            const data = await res.json();

            if (data.success) {
                alert("Access request sent successfully!");
                setPatientId("");
                setReason("");
                fetchRequests();
            } else {
                alert(data.error || "Request failed");
            }
        } catch (error: any) {
            console.error("Request error:", error);
            alert("Request failed. Check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-cyan-600 text-xl">Loading...</div>
            </div>
        );
    }

    if (!session || session.user.role !== "diagnostic") return null;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <DiagnosticSidebar
                currentPath={pathname}
                userName={session.user.name || ""}
                userEmail={session.user.email || ""}
                diagnosticId={session.user.providerId || ""}
            />

            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Access Requests</h2>
                        <p className="text-gray-600 mt-1">Request access to patient records and track status.</p>
                    </div>

                    {/* Request Form */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6">New Access Request</h3>
                        <form onSubmit={handleRequest} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Patient ID</label>
                                    <input
                                        type="text"
                                        value={patientId}
                                        onChange={(e) => setPatientId(e.target.value)}
                                        required
                                        placeholder="Enter Patient ID"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Access</label>
                                    <input
                                        type="text"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        required
                                        placeholder="e.g., Uploading Lab Results"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? "Sending Request..." : "Send Request"}
                            </button>
                        </form>
                    </div>

                    {/* Request History */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-8 py-6 border-b border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-900">Request History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-8 py-4 text-sm font-semibold text-gray-600">Patient ID</th>
                                        <th className="px-8 py-4 text-sm font-semibold text-gray-600">Reason</th>
                                        <th className="px-8 py-4 text-sm font-semibold text-gray-600">Date</th>
                                        <th className="px-8 py-4 text-sm font-semibold text-gray-600">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {requests.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-12 text-center text-gray-500">
                                                No access requests found.
                                            </td>
                                        </tr>
                                    ) : (
                                        requests.map((request: any) => (
                                            <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-8 py-4 font-mono text-sm text-gray-900">{request.patientId}</td>
                                                <td className="px-8 py-4 text-sm text-gray-600">{request.reason}</td>
                                                <td className="px-8 py-4 text-sm text-gray-600">{new Date(request.createdAt).toLocaleDateString()}</td>
                                                <td className="px-8 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${request.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            request.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
