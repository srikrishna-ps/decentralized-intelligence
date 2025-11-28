import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const type = formData.get("type") as string;

        if (!file || !title || !description) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectDB();

        // TODO: Upload to IPFS
        // const ipfsHash = await uploadToIPFS(file);

        // TODO: Store hash on blockchain
        // const txHash = await storeOnBlockchain(ipfsHash, session.user.patientId);

        // For now, simulate success
        const mockRecord = {
            id: Date.now().toString(),
            title,
            description,
            type,
            fileName: file.name,
            fileSize: file.size,
            uploadedBy: session.user.patientId,
            status: "active",
            ipfsHash: "Qm" + Math.random().toString(36).substring(7), // Mock IPFS hash
            blockchainTxHash: "0x" + Math.random().toString(36).substring(7), // Mock tx hash
            createdAt: new Date().toISOString(),
        };

        return NextResponse.json({
            success: true,
            message: "Record uploaded successfully",
            record: mockRecord,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Upload failed" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession();

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "active";

        await connectDB();

        // TODO: Fetch from MongoDB
        // const records = await Record.find({ patientId: session.user.patientId, status });

        // For now, return empty array
        return NextResponse.json({
            success: true,
            records: [],
        });
    } catch (error) {
        console.error("Fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch records" },
            { status: 500 }
        );
    }
}
