import NextAuth, { type NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./db"

type Role = "STUDENT" | "TEACHER" | "ADMIN"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(creds) {
        const email = (creds?.email || "").toString().trim().toLowerCase()
        const password = (creds?.password || "").toString()
        const role = ((creds?.role || "student").toString().toUpperCase() as Role) || "STUDENT"

        // Demo: allow mocked credentials (teacher/student). Replace with real verification later.
        const ok =
          (role === "TEACHER" && email === "teacher@example.com" && password === "teacherpass") ||
          (role === "STUDENT" && email === "student@example.com" && password === "studentpass")
        if (!ok) return null

        // Upsert user in DB
        const user = await prisma.user.upsert({
          where: { email },
          update: { role },
          create: { email, role },
        })
        return { id: user.id, email: user.email!, name: user.name || undefined, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // @ts-ignore
        token.role = (user as any).role || token.role
      }
      return token
    },
    async session({ session, token }) {
      // @ts-ignore
      session.user = session.user || {}
      // @ts-ignore
      session.user.role = (token as any).role || "STUDENT"
      return session
    },
  },
  pages: {},
  secret: process.env.NEXTAUTH_SECRET,
}

export const { auth } = NextAuth(authOptions)
