"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import InsurerSidebar from "@/components/sidebars/InsurerSidebar";

export default function InsurerActivityPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'request_access'>('all');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "insurer") router.push("/");
    }, [status, session, router]);

    useEffect(() => {
        if (session?.user?.providerId) {
            fetchActivities();
        }
    }, [session, filter]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${backendUrl}/api/insurer/activity/${session?.user?.providerId}?action=${filter}`);
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

    if (!session || session.user.role !== "insurer") return null;

    const getActivityTitle = (activity: any) => {
        switch (activity.action) {
            case 'request_access':
                return `Requested Access to Patient ${activity.details?.patientId || ''}`;
            default:
                return `${activity.action} - ${activity.resourceType}`;
        }
    };

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
                        <h2 className="text-3xl font-bold text-gray-900">Activity Log</h2>
                        <p className="text-gray-600 mt-1">Track all your actions and requests</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-6 py-3 font-medium transition-colors border-b-2 ${filter === 'all'
                                ? 'border-cyan-600 text-cyan-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('request_access')}
                            className={`px-6 py-3 font-medium transition-colors border-b-2 ${filter === 'request_access'
                                ? 'border-cyan-600 text-cyan-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Requests
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        {activities.length === 0 ? (
                            <div className="text-center py-16">
                                <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">No activity yet</h4>
                                <p className="text-gray-600">Your activity will appear here as you use the system</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activities.map((activity: any) => (
                                    <div key={activity.id} className="flex items-start justify-between gap-5 p-5 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                                        <div className="flex-1">
                                            <h4 className="text-base font-semibold text-gray-900">{getActivityTitle(activity)}</h4>
                                            <p className="text-base text-gray-600 mt-1.5">
                                                {activity.details?.reason || ''}
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-500 whitespace-nowrap">
                                            {new Date(activity.timestamp).toLocaleString()}
                                        </p>
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
