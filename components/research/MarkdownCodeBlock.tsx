'use client'

import { useState } from 'react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import sh_python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import sh_javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import sh_typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import sh_jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'
import sh_tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import sh_bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import sh_json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import sh_yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'
import sh_sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import sh_java from 'react-syntax-highlighter/dist/esm/languages/prism/java'

SyntaxHighlighter.registerLanguage('python', sh_python)
SyntaxHighlighter.registerLanguage('javascript', sh_javascript)
SyntaxHighlighter.registerLanguage('typescript', sh_typescript)
SyntaxHighlighter.registerLanguage('jsx', sh_jsx)
SyntaxHighlighter.registerLanguage('tsx', sh_tsx)
SyntaxHighlighter.registerLanguage('bash', sh_bash)
SyntaxHighlighter.registerLanguage('shell', sh_bash)
SyntaxHighlighter.registerLanguage('json', sh_json)
SyntaxHighlighter.registerLanguage('yaml', sh_yaml)
SyntaxHighlighter.registerLanguage('sql', sh_sql)
SyntaxHighlighter.registerLanguage('java', sh_java)

/** Prism에 등록된 언어만 색상 강조가 붙는다. 등록되지 않은 언어는 강조 없이 일반
 *  모노스페이스 텍스트로 안전하게 폴백한다. */
const SYNTAX_HIGHLIGHT_LANGS = new Set([
  'python', 'javascript', 'typescript', 'jsx', 'tsx', 'bash', 'shell', 'json', 'yaml', 'sql', 'java'
])

/**
 * `navigator.clipboard`는 보안 컨텍스트(HTTPS 또는 localhost)가 아니면 존재하지 않거나
 * 조용히 reject된다. `document.execCommand('copy')` 기반 폴백으로 그런 환경에서도 복사가 되게 한다.
 */
async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 아래 execCommand 폴백으로 이어간다.
    }
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

function downloadTextAsFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  try {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    // Blob/URL API가 막힌 극히 예외적인 환경 — 복사 버튼이 별도로 있으니 조용히 무시한다.
  }
}

/** Prism 강조가 등록된 언어는 색상 강조로, 등록되지 않은 언어는 일반 모노스페이스 텍스트로
 *  안전하게 렌더링하는 코드 본문. */
function CodeBody({ language, source }: { language: string; source: string }) {
  const lang = language.toLowerCase()
  if (SYNTAX_HIGHLIGHT_LANGS.has(lang)) {
    return (
      <div style={{ maxHeight: '420px', overflow: 'auto', background: '#0d1117' }}>
        <SyntaxHighlighter
          language={lang}
          style={oneDark}
          customStyle={{ margin: 0, padding: '12px 14px', fontSize: '12px', lineHeight: 1.6, background: 'transparent' }}
          codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }}
        >
          {source}
        </SyntaxHighlighter>
      </div>
    )
  }
  return (
    <pre style={{
      margin: 0, padding: '12px 14px', maxHeight: '420px', overflow: 'auto',
      fontSize: '12px', lineHeight: 1.6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      color: '#e6edf3', background: '#0d1117'
    }}>
      <code>{source}</code>
    </pre>
  )
}

/**
 * AI 리서치 채팅(ReactMarkdown)의 펜스 코드블록(```python ... ```)을 Claude/Gemini 스타일
 * 패키지(언어 배지 + 복사 + 다운로드 + 스크롤 박스)로 렌더링한다.
 */
function MarkdownCodeBlock({ language, source }: { language: string; source: string }) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle')
  const lang = (language || 'text').toLowerCase()
  const displayLang = lang === 'py' ? 'python' : lang
  const filename = displayLang === 'python' ? 'strategy.py' : displayLang === 'pine' ? 'strategy.pine' : `snippet.${displayLang || 'txt'}`
  const mime = displayLang === 'python' ? 'text/x-python;charset=utf-8' : 'text/plain;charset=utf-8'

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(source)
    setCopied(ok ? 'ok' : 'fail')
    setTimeout(() => setCopied('idle'), 1500)
  }

  return (
    <div style={{ margin: '10px 0', borderRadius: '8px', overflow: 'hidden', border: '1px solid #23262d', background: '#0d1117' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
        padding: '6px 10px', background: '#161b22', borderBottom: '1px solid #23262d'
      }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {displayLang}
        </span>
        <span style={{ display: 'flex', gap: '6px' }}>
          <button type="button" onClick={handleCopy} style={{
            fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', cursor: 'pointer',
            border: '1px solid #2d333b', background: '#0d1117', color: copied === 'ok' ? '#4ade80' : copied === 'fail' ? '#f87171' : '#94a3b8'
          }}>
            {copied === 'ok' ? '복사됨 ✓' : copied === 'fail' ? '복사 실패' : '복사'}
          </button>
          <button type="button" onClick={() => downloadTextAsFile(filename, source, mime)} style={{
            fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', cursor: 'pointer',
            border: '1px solid #2d333b', background: '#0d1117', color: '#94a3b8'
          }}>
            다운로드
          </button>
        </span>
      </div>
      <CodeBody language={displayLang} source={source} />
    </div>
  )
}

/** ReactMarkdown의 `code` 컴포넌트를 이 함수로 교체하면 펜스 코드블록만 MarkdownCodeBlock으로,
 * 문장 중간의 인라인 코드(`foo()`)는 짧은 배지로 렌더링된다. */
function MarkdownCodeRenderer({ className, children }: { className?: string; children?: React.ReactNode }) {
  const match = /language-(\w+)/.exec(className || '')
  const source = String(children).replace(/\n$/, '')
  // 언어 태그 없이 ``` 로만 감싼 펜스 블록도 줄바꿈이 있으면 블록으로 취급한다.
  // 그렇지 않으면 인라인 <code>(white-space: normal)로 렌더링되어 줄바꿈이 뭉개지고
  // 복사/다운로드 버튼도 사라져 버린다.
  if (!match && !source.includes('\n')) {
    return (
      <code style={{
        background: '#eef1f5', padding: '1px 5px', borderRadius: '4px',
        fontSize: '0.9em', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
      }}>
        {children}
      </code>
    )
  }
  return <MarkdownCodeBlock language={match ? match[1] : 'text'} source={source} />
}

/** MarkdownCodeBlock이 자체 <pre>로 코드 박스를 그리므로, react-markdown이 기본으로
 *  씌우는 <pre>는 그대로 통과시켜 이중 래핑을 막는다. */
function MarkdownPreFragment({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

/**
 * ReactMarkdown의 `components` prop을 렌더링마다 새 객체 리터럴로 넘기면(특히 `pre`가
 * 매번 새로 만들어지는 인라인 화살표 함수라면), React가 "다른 컴포넌트 타입"으로 취급해
 * 그 하위 트리(코드 블록 전체, 스크롤 컨테이너, 복사/다운로드 버튼 포함)를 매 렌더마다
 * 통째로 언마운트·재마운트한다. 이 페이지는 폴링/웹소켓 타이머가 많아 매우 자주 재렌더되므로,
 * 그때마다 코드 박스의 스크롤 위치가 0으로 튕기고 복사 버튼이 DOM에서 떨어져 나가
 * 클릭이 씹히는 버그로 실측됐다. 이 객체를 모듈 스코프 상수로 고정해 컴포넌트 아이덴티티를
 * 렌더 간에 안정적으로 유지한다 — ReactMarkdown을 쓰는 컴포넌트는 반드시 이 상수를 써야 한다.
 */
export const MARKDOWN_CHAT_COMPONENTS = { code: MarkdownCodeRenderer, pre: MarkdownPreFragment }
