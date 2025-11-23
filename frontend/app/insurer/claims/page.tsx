"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import InsurerSidebar from "@/components/sidebars/InsurerSidebar";

export default function InsurerClaimsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "insurer") router.push("/");
    }, [status, session, router]);

    useEffect(() => {
        if (session?.user?.providerId) {
            fetchClaims();
        }
    }, [session]);

    const fetchClaims = async () => {
        try {
            setLoading(true);
            // Mock endpoint for now as claims logic might not be fully implemented backend-side
            // const res = await fetch(`${backendUrl}/api/insurer/claims/${session?.user?.providerId}`);
            // const data = await res.json();

            // Simulating empty claims for now to match current state
            setClaims([]);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch claims:", error);
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
                        <h2 className="text-3xl font-bold text-gray-900">Insurance Claims</h2>
                        <p className="text-gray-600 mt-1">Manage and process insurance claims</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        {claims.length === 0 ? (
                            <div className="text-center py-16">
                                <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">No claims found</h4>
                                <p className="text-gray-600">There are no active claims to display</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Claims list would go here */}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
