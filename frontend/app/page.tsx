"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      router.push(`/${session.user.role}`);
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-cyan-600 text-xl font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">MediChain</h1>
            </div>
            <div className="flex gap-3">
              <Link
                href="/login"
                className="px-5 py-2 text-gray-700 font-medium hover:text-cyan-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
          <div>
            <div className="inline-block mb-4 px-4 py-2 bg-cyan-50 text-cyan-700 rounded-full text-sm font-semibold">
              Blockchain-Powered Healthcare
            </div>
            <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Your Medical Records,
              <br />
              <span className="text-cyan-600">Secured Forever</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Take complete control of your health data with decentralized storage,
              end-to-end encryption, and immutable blockchain verification.
            </p>
            <div className="flex gap-4">
              <Link
                href="/signup"
                className="px-8 py-4 bg-cyan-600 text-white text-lg font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-lg border-2 border-gray-300 hover:border-cyan-600 hover:text-cyan-600 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
          <div className="bg-gray-100 rounded-2xl p-8 h-96 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-32 h-32 mx-auto mb-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-gray-600 font-medium">Secure Medical Records</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mb-24">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Why MediChain?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl border-2 border-gray-200 hover:border-cyan-600 transition-colors">
              <div className="w-12 h-12 bg-cyan-600 rounded-lg flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Patient-Controlled Access</h4>
              <p className="text-gray-600 leading-relaxed">
                You decide who can access your medical records. Grant and revoke permissions instantly with blockchain-verified consent.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border-2 border-gray-200 hover:border-cyan-600 transition-colors">
              <div className="w-12 h-12 bg-cyan-600 rounded-lg flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Decentralized Storage</h4>
              <p className="text-gray-600 leading-relaxed">
                Your medical files are encrypted and stored on IPFS, ensuring no single point of failure and permanent availability.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border-2 border-gray-200 hover:border-cyan-600 transition-colors">
              <div className="w-12 h-12 bg-cyan-600 rounded-lg flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Immutable Audit Trail</h4>
              <p className="text-gray-600 leading-relaxed">
                Every access and modification is permanently recorded on the blockchain with timestamps and transaction hashes.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-cyan-50 rounded-2xl p-12 mb-24">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-cyan-600 mb-2">100%</div>
              <div className="text-gray-700 font-medium">Patient Ownership</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-600 mb-2">256-bit</div>
              <div className="text-gray-700 font-medium">Encryption Standard</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-600 mb-2">∞</div>
              <div className="text-gray-700 font-medium">Permanent Storage</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-cyan-600 rounded-2xl p-12 text-center text-white">
          <h3 className="text-4xl font-bold mb-4">Ready to Take Control?</h3>
          <p className="text-xl text-cyan-100 mb-8">Join the future of healthcare data management</p>
          <Link
            href="/signup"
            className="inline-block px-10 py-4 bg-white text-cyan-600 text-lg font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm">© 2024 MediChain. Powered by Blockchain Technology.</p>
        </div>
      </footer>
    </div>
  );
}
