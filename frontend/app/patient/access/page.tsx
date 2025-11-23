"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import PatientSidebar from "@/components/sidebars/PatientSidebar";

export default function PatientAccessPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [providerId, setProviderId] = useState("");
    const [providerRole, setProviderRole] = useState("doctor");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [accessList, setAccessList] = useState([]);
    const [fetchingGrants, setFetchingGrants] = useState(true);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "patient") router.push("/");
    }, [status, session, router]);

    useEffect(() => {
        if (session?.user?.patientId) {
            fetchAccessGrants();
        }
    }, [session]);

    const fetchAccessGrants = async () => {
        try {
            setFetchingGrants(true);
            const res = await fetch(`${backendUrl}/api/patient/access-grants/${session?.user?.patientId}`);
            const data = await res.json();

            if (data.success) {
                setAccessList(data.grants || []);
            }
        } catch (error) {
            console.error("Failed to fetch access grants:", error);
        } finally {
            setFetchingGrants(false);
        }
    };

    const handleGrantAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${backendUrl}/api/patient/grant-access`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patientId: session?.user?.patientId,
                    providerId,
                    providerRole,
                    reason,
                }),
            });

            const data = await res.json();

            if (data.success) {
                alert("Access granted successfully!");
                setProviderId("");
                setReason("");
                fetchAccessGrants();
            } else {
                alert(data.error || "Failed to grant access");
            }
        } catch (error: any) {
            console.error("Grant access error:", error);
            alert("Failed to grant access. Check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeAccess = async (grantId: string) => {
        if (!confirm("Are you sure you want to revoke this access?")) return;

        try {
            const res = await fetch(`${backendUrl}/api/patient/access-grants/${grantId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ patientId: session?.user?.patientId }),
            });

            const data = await res.json();

            if (data.success) {
                alert("Access revoked successfully!");
                fetchAccessGrants();
            } else {
                alert(data.error || "Failed to revoke access");
            }
        } catch (error: any) {
            console.error("Revoke access error:", error);
            alert("Failed to revoke access");
        }
    };

    if (status === "loading" || fetchingGrants) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-cyan-600 text-xl">Loading...</div>
            </div>
        );
    }

    if (!session || session.user.role !== "patient") return null;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <PatientSidebar
                currentPath={pathname}
                userName={session.user.name || ""}
                userEmail={session.user.email || ""}
                patientId={session.user.patientId || ""}
            />

            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Access Control</h2>
                        <p className="text-gray-600 mt-1">Manage who can access your medical records</p>
                    </div>

                    <div className="space-y-8">
                        {/* Grant New Access - Top */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                            <h3 className="text-xl font-semibold text-gray-900 mb-6">Grant New Access</h3>
                            <form onSubmit={handleGrantAccess} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Provider ID
                                    </label>
                                    <input
                                        type="text"
                                        value={providerId}
                                        onChange={(e) => setProviderId(e.target.value)}
                                        placeholder="Enter provider ID (e.g., DOC-1234567890-ABC123DEF)"
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-600 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Provider Role
                                    </label>
                                    <select
                                        value={providerRole}
                                        onChange={(e) => setProviderRole(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-600 focus:border-transparent"
                                    >
                                        <option value="doctor">Doctor</option>
                                        <option value="diagnostic">Diagnostic Center</option>
                                        <option value="insurer">Insurance Company</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Reason for Access
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Why are you granting access?"
                                        rows={2}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-600 focus:border-transparent"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
                                    >
                                        {loading ? "Granting Access..." : "Grant Access"}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Active Access Grants - Bottom with Scroll */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col h-[600px]">
                            <h3 className="text-xl font-semibold text-gray-900 mb-6">Active Access Grants</h3>
                            <div className="flex-1 overflow-y-auto pr-2">
                                <div className="space-y-4">
                                    {accessList.length === 0 ? (
                                        <div className="text-center py-16">
                                            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <p className="text-gray-600">No active access grants</p>
                                        </div>
                                    ) : (
                                        accessList.map((grant: any) => (
                                            <div key={grant.grantId} className="border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-gray-900 text-lg">{grant.providerId}</p>
                                                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium capitalize text-gray-600">
                                                                {grant.providerRole}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                                        Active
                                                    </span>
                                                </div>
                                                <p className="text-base text-gray-700">{grant.reason}</p>
                                                <div className="flex justify-between items-center pt-2">
                                                    <p className="text-xs text-gray-500">
                                                        Granted: {new Date(grant.grantedAt).toLocaleDateString()}
                                                    </p>
                                                    <button
                                                        onClick={() => handleRevokeAccess(grant.grantId)}
                                                        className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                                                    >
                                                        Revoke Access
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
