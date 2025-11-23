"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import DiagnosticSidebar from "@/components/sidebars/DiagnosticSidebar";
import Link from "next/link";

export default function DiagnosticDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "diagnostic") router.push("/");
    }, [status, session, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-cyan-600 text-xl">Loading...</div>
            </div>
        );
    }

    if (!session || session.user.role !== "diagnostic") return null;

    const features = [
        {
            title: "Upload Results",
            description: "Upload diagnostic test results for patients",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            ),
            link: "/diagnostic/upload",
            bgColor: "bg-cyan-50",
            iconColor: "text-cyan-600"
        },
        {
            title: "My Uploads",
            description: "View all test results you've uploaded",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            link: "/diagnostic/my-uploads",
            bgColor: "bg-cyan-50",
            iconColor: "text-cyan-600"
        },
        {
            title: "Access Requests",
            description: "Request access to patient records",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            ),
            link: "/diagnostic/requests",
            bgColor: "bg-cyan-50",
            iconColor: "text-cyan-600"
        },
        {
            title: "Activity Log",
            description: "Track your recent activities",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            ),
            link: "/diagnostic/activity",
            bgColor: "bg-cyan-50",
            iconColor: "text-cyan-600"
        }
    ];

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
                        <h2 className="text-3xl font-bold text-gray-900">Diagnostic Dashboard</h2>
                        <p className="text-gray-600 mt-1">Welcome back, {session.user.name}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                        {features.map((feature, index) => (
                            <Link key={index} href={feature.link} className="block group">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow h-full">
                                    <div className="flex items-start space-x-4">
                                        <div className={`p-3 rounded-lg ${feature.bgColor} ${feature.iconColor}`}>
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {feature.title}
                                            </h3>
                                            <p className="text-gray-600 mt-1 text-sm">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
