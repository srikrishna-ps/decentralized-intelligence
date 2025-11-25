import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";

export const authOptions: AuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    await connectDB();
                    const user = await User.findOne({ email: credentials.email });

                    if (!user || !user.password) {
                        return null;
                    }

                    // Check Status
                    if (user.status === 'pending') {
                        throw new Error("Your account is pending admin approval.");
                    }
                    if (user.status === 'rejected') {
                        throw new Error("Your account registration was rejected.");
                    }

                    const isValid = await bcrypt.compare(credentials.password, user.password);
                    if (!isValid) {
                        return null;
                    }

                    return {
                        id: user._id.toString(),
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        patientId: user.patientId,
                        providerId: user.providerId,
                    };
                } catch (error: any) {
                    console.error("Auth error:", error);
                    throw new Error(error.message || "Authentication failed");
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }: any) {
            if (account?.provider === "google") {
                try {
                    await connectDB();
                    const existingUser = await User.findOne({ email: user.email });

                    if (!existingUser) {
                        const newUser = await User.create({
                            email: user.email,
                            name: user.name,
                            googleId: account.providerAccountId,
                            role: "patient",
                        });

                        user.role = newUser.role;
                        user.patientId = newUser.patientId;
                        user.providerId = newUser.providerId;
                    } else {
                        // Check Status for existing users
                        if (existingUser.status === 'pending' || existingUser.status === 'rejected') {
                            return false; // Deny access
                        }

                        user.role = existingUser.role;
                        user.patientId = existingUser.patientId;
                        user.providerId = existingUser.providerId;
                    }
                } catch (error) {
                    console.error("Google sign in error:", error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user, account }: any) {
            if (user) {
                token.role = user.role || "patient";
                token.patientId = user.patientId;
                token.providerId = user.providerId;
            } else if (account?.provider === "google" && token.email && !token.role) {
                try {
                    await connectDB();
                    const dbUser = await User.findOne({ email: token.email });
                    if (dbUser) {
                        token.role = dbUser.role;
                        token.patientId = dbUser.patientId;
                        token.providerId = dbUser.providerId;
                    }
                } catch (error) {
                    console.error("JWT error:", error);
                }
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session?.user) {
                session.user.role = token.role;
                session.user.patientId = token.patientId;
                session.user.providerId = token.providerId;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt" as const,
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
