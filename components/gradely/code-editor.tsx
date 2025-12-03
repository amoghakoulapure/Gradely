// Minimal Monaco Editor wrapper with markers, localStorage persistence, and highlights

"use client"

import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react"
import { useCallback, useEffect, useRef } from "react"
import type * as Monaco from "monaco-editor"
import { useDebouncedCallback } from "use-debounce"
import type { ReviewIssue } from "./review-panel"

const GRADELY_THEME = "gradely-syntax"

export type EditorHandle = {
  getValue: () => string
  setValue: (code: string) => void
  setMarkers: (issues: ReviewIssue[]) => void
  revealLine: (line: number) => void
  addHighlights: (startLine: number, endLine?: number) => void
  clearHighlights: () => void
}

export function CodeEditor(props: {
  language: string
  initialValue: string
  storageKey: string
  onMount?: (handle: EditorHandle) => void
  onChange?: (code: string) => void // optional live change callback
}) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const decorationsRef = useRef<string[]>([]) // track highlight decorations

  const save = useDebouncedCallback((val: string) => {
    try {
      window.localStorage.setItem(props.storageKey, val)
    } catch {}
  }, 500)

  const beforeMount: BeforeMount = useCallback((monaco) => {
    monaco.editor.defineTheme(GRADELY_THEME, {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "94a3b8", fontStyle: "italic" },
        { token: "keyword", foreground: "a21caf", fontStyle: "bold" },
        { token: "string", foreground: "0f9d58" },
        { token: "number", foreground: "c2410c" },
        { token: "type", foreground: "2563eb" },
        { token: "function", foreground: "1d4ed8" },
        { token: "variable", foreground: "0f172a" },
      ],
      colors: {
        "editor.background": "#fafbff",
        "editor.foreground": "#0f172a",
        "editorLineNumber.foreground": "#94a3b8",
        "editorLineNumber.activeForeground": "#475569",
        "editorCursor.foreground": "#1e40af",
        "editor.selectionBackground": "#c7d2fe",
        "editor.inactiveSelectionBackground": "#e0e7ff",
        "editorIndentGuide.background": "#e2e8f0",
        "editorWhitespace.foreground": "#e2e8f0",
      },
    })
  }, [])

  const onMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor
      monacoRef.current = monaco
      monaco.editor.setTheme(GRADELY_THEME)

      // Provide an imperative API to parent
      props.onMount?.({
        getValue: () => editor.getValue(),
        setValue: (code) => editor.setValue(code),
        revealLine: (line) => {
          editor.revealLineInCenter(line)
          editor.setPosition({ lineNumber: line, column: 1 })
          editor.focus()
        },
        setMarkers: (issues) => {
          const model = editor.getModel()
          if (!model) return
          const markers: Monaco.editor.IMarkerData[] = (issues || []).map((it) => ({
            startLineNumber: Math.max(1, it.line || 1),
            endLineNumber: Math.max(1, it.line || 1),
            startColumn: 1,
            endColumn: 120,
            message: it.message,
            severity:
              it.severity === "error"
                ? monaco.MarkerSeverity.Error
                : it.severity === "warning"
                  ? monaco.MarkerSeverity.Warning
                  : monaco.MarkerSeverity.Info,
            source: "Gradely",
          }))
          monaco.editor.setModelMarkers(model, "gradely", markers)
        },
        addHighlights: (startLine: number, endLine?: number) => {
          const model = editor.getModel()
          if (!model || !monaco) return
          const start = Math.max(1, startLine)
          const end = Math.max(start, endLine ?? start)
          // Remove previous first
          if (decorationsRef.current.length) {
            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
          }
          decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
            {
              range: new monaco.Range(start, 1, end, 1),
              options: {
                isWholeLine: true,
                className: "gradely-line-highlight",
                marginClassName: "gradely-line-highlight-margin",
              },
            },
          ])
        },
        clearHighlights: () => {
          if (editor && decorationsRef.current.length) {
            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
          }
        },
      })

      // Save on change
      editor.onDidChangeModelContent(() => {
        const val = editor.getValue()
        save(val)
        props.onChange?.(val)
      })
    },
    [props, save],
  )

  // Ensure initial value loaded
  useEffect(() => {
    if (!editorRef.current) return
    const current = editorRef.current.getValue()
    if (!current && props.initialValue) {
      editorRef.current.setValue(props.initialValue)
    }
  }, [props.initialValue])

  // Map languages to Monaco ids
  const monacoLang =
    props.language === "typescript"
      ? "typescript"
      : props.language === "javascript"
        ? "javascript"
        : props.language === "python"
          ? "python"
          : props.language === "java"
            ? "java"
            : props.language === "c"
              ? "cpp"
              : "html"

  return (
    <div className="rounded-xl border overflow-hidden glass-surface">
      <Editor
        height="60vh"
        defaultLanguage={monacoLang}
        defaultValue={props.initialValue}
        theme={GRADELY_THEME}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          automaticLayout: true,
          tabSize: 2,
          scrollBeyondLastLine: false,
        }}
        beforeMount={beforeMount}
        onMount={onMount}
      />
    </div>
  )
}

// Add these classes in globals.css if you want custom colors:
// .gradely-line-highlight { background-color: color-mix(in oklab, var(--accent) 22%, transparent); }
// .gradely-line-highlight-margin { border-left: 3px solid var(--accent); }
