"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import PatientSidebar from "@/components/sidebars/PatientSidebar";

export default function PatientActivityPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'upload' | 'access' | 'edit'>('all');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "patient") router.push("/");
    }, [status, session, router]);

    useEffect(() => {
        if (session?.user?.patientId) {
            fetchActivities();
        }
    }, [session, filter]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const actionParam = filter === 'access' ? 'grant_access,revoke_access' : filter;
            const res = await fetch(`${backendUrl}/api/patient/activity/${session?.user?.patientId}?action=${actionParam}`);
            const data = await res.json();

            if (data.success) {
                setActivities(data.activities || []);
            }
        } catch (error) {
            console.error("Failed to fetch activities:", error);
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

    if (!session || session.user.role !== "patient") return null;

    const getActivityIcon = (action: string) => {
        switch (action) {
            case 'upload':
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                );
            case 'grant_access':
            case 'revoke_access':
            case 'request_access':
            case 'approve_request':
            case 'reject_request':
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                );
            case 'edit':
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                );
        }
    };

    const getActivityTitle = (activity: any) => {
        switch (activity.action) {
            case 'upload':
                return `Uploaded: ${activity.details?.title || 'Medical Record'}`;
            case 'grant_access':
                return `Granted Access to ${activity.details?.providerName || activity.details?.providerId || 'Provider'}`;
            case 'revoke_access':
                return `Revoked Access from ${activity.details?.providerName || activity.details?.providerId || 'Provider'}`;
            case 'approve_request':
                return `Approved Access Request from ${activity.details?.providerName || activity.details?.providerId || 'Provider'}`;
            case 'reject_request':
                return `Rejected Access Request from ${activity.details?.providerName || activity.details?.providerId || 'Provider'}`;
            default:
                return `${activity.action} - ${activity.resourceType}`;
        }
    };

    const getActivityDescription = (activity: any) => {
        switch (activity.action) {
            case 'upload':
                return `Uploaded ${activity.details?.type?.replace('_', ' ') || 'document'}: ${activity.details?.filename || ''}`;
            case 'grant_access':
            case 'approve_request':
                const role = activity.details?.providerRole || 'provider';
                const providerId = activity.details?.providerId || '';
                return `${role.charAt(0).toUpperCase() + role.slice(1)} (${providerId}) - ${activity.details?.reason || 'Access granted'}`;
            case 'revoke_access':
                return `Access revoked from ${activity.details?.providerRole || 'provider'}`;
            case 'reject_request':
                return `Request rejected from ${activity.details?.providerRole || 'provider'}`;
            default:
                return `Performed ${activity.action} on ${activity.resourceType}`;
        }
    };

    const filteredActivities = activities.filter((activity: any) => {
        if (filter === 'all') return true;
        if (filter === 'access') return ['grant_access', 'revoke_access', 'approve_request', 'reject_request'].includes(activity.action);
        return activity.action === filter;
    });

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
                        <h2 className="text-3xl font-bold text-gray-900">Activity Log</h2>
                        <p className="text-gray-600 mt-1">Track all your actions and system events</p>
                    </div>

                    <div className="flex gap-2 mb-6 border-b border-gray-200">
                        {[
                            { id: 'all', label: 'All Activities' },
                            { id: 'upload', label: 'Uploads' },
                            { id: 'access', label: 'Access Control' },
                            { id: 'edit', label: 'Edits' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id as any)}
                                className={`px-6 py-3 font-medium transition-colors border-b-2 ${filter === tab.id
                                    ? 'border-cyan-600 text-cyan-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {filteredActivities.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="text-gray-600">No activities found</p>
                            </div>
                        ) : (
                            filteredActivities.map((activity: any) => (
                                <div key={activity._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-cyan-50 rounded-lg flex items-center justify-center text-cyan-600 flex-shrink-0">
                                            {getActivityIcon(activity.action)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                    {getActivityTitle(activity)}
                                                </h3>
                                                <p className="text-xs text-gray-500 whitespace-nowrap ml-4">
                                                    {new Date(activity.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                            <p className="text-gray-600">
                                                {getActivityDescription(activity)}
                                            </p>
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
