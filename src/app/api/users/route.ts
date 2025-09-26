import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        // Ambil token dari header Authorization request client
        const authHeader = req.headers.get("authorization");
        console.log("Auth Header diterima:", authHeader);
        if (!authHeader) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Validasi format "Bearer <token>"
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return NextResponse.json({ message: "Invalid token format" }, { status: 401 });
        }

        // Request ke Go server, teruskan Authorization header
        const goRes = await fetch("http://localhost:3001/api/users", {
            method: "GET",
            headers: {
                Authorization: authHeader, // teruskan token apa adanya
            },
        });

        const result = await goRes.json();

        // Jika Go server error, lempar ke client
        if (!goRes.ok) {
            return NextResponse.json(
                { message: result.message || "Failed to fetch users" },
                { status: goRes.status }
            );
        }

        // Sukses → teruskan response asli
        return NextResponse.json(result, { status: goRes.status });
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}