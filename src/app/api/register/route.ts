import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const data = await req.json(); // Ambil body dari client

    // Kirim request ke Go server
    const goRes = await fetch("http://localhost:3001/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await goRes.json();

    // Jika Go server error, lempar ke client
    if (!goRes.ok) {
      return NextResponse.json({ message: result.message || "Register failed" }, { status: goRes.status });
    }

    // Sukses
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
}
