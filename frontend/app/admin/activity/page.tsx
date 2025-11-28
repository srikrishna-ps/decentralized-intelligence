"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import AdminSidebar from "@/components/sidebars/AdminSidebar";

export default function AdminActivityPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "admin") router.push("/");
    }, [status, session, router]);

    useEffect(() => {
        fetchActivities();
    }, [filter]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${backendUrl}/api/admin/activity?action=${filter}`);
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

    if (!session || session.user.role !== "admin") return null;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <AdminSidebar
                currentPath={pathname}
                userName={session.user.name || ""}
                userEmail={session.user.email || ""}
                adminId={session.user.email || ""}
            />

            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">System Activity Log</h2>
                        <p className="text-gray-600 mt-1">Monitor all system activities and user actions</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mb-6">
                        {['all', 'login', 'upload', 'access'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilter(type)}
                                className={`px-6 py-3 font-medium capitalize transition-colors border-b-2 ${filter === type
                                    ? 'border-cyan-600 text-cyan-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        {activities.length === 0 ? (
                            <div className="text-center py-16">
                                <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">No activity yet</h4>
                                <p className="text-gray-600">System activity will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activities.map((activity: any) => (
                                    <div key={activity.id} className="flex items-start justify-between gap-5 p-5 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${activity.action === 'login' ? 'bg-blue-100 text-blue-700' :
                                                    activity.action === 'upload' ? 'bg-green-100 text-green-700' :
                                                        activity.action === 'access' ? 'bg-purple-100 text-purple-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {activity.action}
                                                </span>
                                                <span className="text-sm text-gray-500">•</span>
                                                <span className="text-sm font-medium text-gray-900 capitalize">{activity.resourceType}</span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium text-gray-900">User:</span> {activity.userId}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium text-gray-900">Resource ID:</span> {activity.resourceId}
                                            </p>
                                            {activity.details && (
                                                <pre className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 overflow-x-auto">
                                                    {JSON.stringify(activity.details, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500 whitespace-nowrap">
                                                {new Date(activity.timestamp).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(activity.timestamp).toLocaleTimeString()}
                                            </p>
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
