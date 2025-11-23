"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import AdminSidebar from "@/components/sidebars/AdminSidebar";

export default function AdminUsersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "admin") router.push("/");
    }, [status, session, router]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${backendUrl}/api/admin/users`);
            const data = await res.json();

            if (data.success) {
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = filter === "all" ? users : users.filter((user: any) => user.role === filter);

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
                adminId={session.user.id || ""}
            />

            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
                        <p className="text-gray-600 mt-1">Manage all users and their roles.</p>
                    </div>

                    {/* Filters */}
                    <div className="flex border-b border-gray-200 mb-6">
                        {['all', 'patient', 'doctor', 'diagnostic', 'insurer'].map((role) => (
                            <button
                                key={role}
                                onClick={() => setFilter(role)}
                                className={`px-6 py-3 font-medium capitalize transition-colors border-b-2 ${filter === role
                                    ? 'border-cyan-600 text-cyan-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>

                    {/* Users Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-600">Email</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-600">Role</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-600">Joined Date</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                No users found matching the filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user: any) => (
                                            <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{user.name}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${user.role === 'patient' ? 'bg-blue-100 text-blue-700' :
                                                        user.role === 'doctor' ? 'bg-green-100 text-green-700' :
                                                            user.role === 'diagnostic' ? 'bg-purple-100 text-purple-700' :
                                                                user.role === 'insurer' ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                                        Active
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
