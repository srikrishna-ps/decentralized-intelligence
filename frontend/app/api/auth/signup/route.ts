import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const { email, name, password, role } = await req.json();

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { success: false, message: "User already exists with this email" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            email,
            name,
            password: hashedPassword,
            role: role || "patient",
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                patientId: user.patientId,
                providerId: user.providerId,
            },
        }, { status: 201 });
    } catch (error: any) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
