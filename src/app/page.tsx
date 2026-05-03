"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  errorsFound: boolean;
  correction: string;
  explanation: string;
  reply: string;
};

const MAX_MESSAGES = 4;

const starterMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Welcome. I am your English coach. Tell me how your week is going.",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [correction, setCorrection] = useState<ChatResponse | null>(null);
  const [level, setLevel] = useState("B1");
  const listRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(true);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading],
  );

  const trimMessages = (items: ChatMessage[]) =>
    items.slice(-MAX_MESSAGES);

  const handleSend = async () => {
    if (!canSend) return;
    const text = input.trim();
    setInput("");
    setLoading(true);
    setCorrection(null);
    autoScrollRef.current = true;
    const nextMessages = trimMessages([
      ...messages,
      { role: "user", content: text },
    ]);
    setMessages(nextMessages);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, level }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as ChatResponse;
      const replyMessage: ChatMessage = {
        role: "assistant",
        content: data.reply ?? "Let's continue.",
      };

      setMessages((prev) => trimMessages([...prev, replyMessage]));
      setCorrection(data);
    } catch {
      setMessages((prev) =>
        trimMessages([
          ...prev,
          {
            role: "assistant",
            content: "I had a connection problem. Please try again.",
          },
        ]),
      );
      setCorrection(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setMessages(starterMessages);
    setInput("");
    setCorrection(null);
    setLoading(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleChatScroll = () => {
    const node = listRef.current;
    if (!node) return;
    const threshold = 80;
    const atBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight < threshold;
    autoScrollRef.current = atBottom;
  };

  useEffect(() => {
    if (!autoScrollRef.current) return;
    requestAnimationFrame(() => {
      const node = listRef.current;
      if (!node) return;
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    });
  }, [messages, loading]);

  return (
    <div className={styles.page}>
      <div className={styles.background} aria-hidden="true">
        <div className={styles.matrixRain} />
        <div className={styles.glowOrb} />
      </div>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Matrix English Tutor</p>
            <h1>English chat with smart corrections</h1>
          </div>
          <div className={styles.controls}>
            <div className={styles.levelPicker}>
              <label htmlFor="level">Level</label>
              <select
                id="level"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              >
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
              </select>
            </div>
            <button
              type="button"
              className={styles.restartButton}
              onClick={handleRestart}
            >
              Restart
            </button>
            <div className={styles.status}>
              <span className={styles.statusDot} />
              <span>Online</span>
            </div>
          </div>
        </header>

        <section className={styles.chatPanel}>
          <div
            className={styles.chatList}
            ref={listRef}
            onScroll={handleChatScroll}
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage
                }
              >
                <p>{message.content}</p>
              </div>
            ))}
            {loading && (
              <div className={styles.assistantMessage}>
                <p className={styles.loadingText}>Correcting...</p>
              </div>
            )}
          </div>

          <div className={styles.inputBar}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write in English..."
              rows={2}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
            >
              Send
            </button>
          </div>
        </section>

        <aside className={styles.correctionPanel}>
          <h2>Correction</h2>
          {correction?.errorsFound ? (
            <div className={styles.correctionContent}>
              <p>
                <span>Corrected:</span> {correction.correction}
              </p>
              <p>
                <span>Explanation:</span> {correction.explanation}
              </p>
            </div>
          ) : (
            <p className={styles.correctionEmpty}>
              No corrections yet.
            </p>
          )}
        </aside>
      </main>
    </div>
  );
}
