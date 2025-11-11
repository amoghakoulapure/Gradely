export type Assignment = {
  id: string
  title: string
  description?: string
  language: "typescript" | "javascript" | "python" | "java"
  createdAt: number
}

export type ReviewIssue = {
  line: number
  message: string
  severity: "info" | "warning" | "error"
  suggestion?: string
}

export type Submission = {
  id: string
  assignmentId: string
  userEmail?: string
  language: Assignment["language"]
  code: string
  createdAt: number
  review: {
    summary: string
    issues: ReviewIssue[]
  }
}

const assignments = new Map<string, Assignment>()
const submissions = new Map<string, Submission>()

export const db = {
  listAssignments(): Assignment[] {
    return Array.from(assignments.values()).sort((a, b) => b.createdAt - a.createdAt)
  },
  getAssignment(id: string): Assignment | undefined {
    return assignments.get(id)
  },
  createAssignment(input: Omit<Assignment, "id" | "createdAt"> & { id?: string }): Assignment {
    const id = input.id ?? crypto.randomUUID()
    const a: Assignment = { id, title: input.title, description: input.description, language: input.language, createdAt: Date.now() }
    assignments.set(id, a)
    return a
  },
  listSubmissionsByAssignment(assignmentId: string): Submission[] {
    return Array.from(submissions.values())
      .filter((s) => s.assignmentId === assignmentId)
      .sort((a, b) => b.createdAt - a.createdAt)
  },
  addSubmission(s: Submission) {
    submissions.set(s.id, s)
  },
}
