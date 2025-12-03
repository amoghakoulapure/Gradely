import { NextResponse } from "next/server"

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 })

export { notFound as GET, notFound as POST }
