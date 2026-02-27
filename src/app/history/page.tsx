"use client";
import "./style.css";
import React, { useState, useEffect, useMemo } from "react";

type Session = {
  id: string;
  user_id: string;
  summary_content: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  dislike_count: number;
  neutral_count: number;
};
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  feedback?: "like" | "dislike" | "neutral";
};

function formatDate(dateString: string) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("th-TH") + " " + date.toLocaleTimeString("th-TH");
}

function extractContextText(summaryContent: string) {
  const text = String(summaryContent || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const contextMatch = text.match(/context\s*:\s*(.*?)(?=\s*(focus|known)\s*:|$)/i);
  if (contextMatch && contextMatch[1]) return contextMatch[1].trim();
  return text;
}

export default function HistoryPage() {
  const [users, setUsers] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [feedbackStats, setFeedbackStats] = useState({ like_count: 0, dislike_count: 0, neutral_count: 0 });
  const [feedbackFilterType, setFeedbackFilterType] = useState<string | null>(null);
  const [dateFilterValue, setDateFilterValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentSessionPage, setCurrentSessionPage] = useState(1);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const SESSIONS_PER_PAGE = 10;
  const MESSAGES_PER_PAGE = 10;

  useEffect(() => {
    fetch("/api/chat-messages/users/list")
      .then((res) => res.json())
      .then((data) => setUsers(data.map((item: any) => item.user_id).filter(Boolean)));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedUsers.length > 0) params.set("user_id", selectedUsers.join(","));
    if (feedbackFilterType) params.set("feedback", feedbackFilterType);
    if (dateFilterValue) params.set("date", dateFilterValue);
    fetch(`/api/chat-sessions?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setSessions(data))
      .finally(() => setLoading(false));
  }, [selectedUsers, feedbackFilterType, dateFilterValue, currentSessionPage]);

  useEffect(() => {
    let url = "/api/chat-feedback";
    if (selectedUsers.length > 0) url += "?user_id=" + selectedUsers.join(",");
    fetch(url)
      .then((res) => res.json())
      .then((data) => setFeedbackStats(data));
  }, [selectedUsers]);

  const totalSessionPages = Math.ceil(sessions.length / SESSIONS_PER_PAGE) || 1;
  const pagedSessions = sessions.slice(
    (currentSessionPage - 1) * SESSIONS_PER_PAGE,
    currentSessionPage * SESSIONS_PER_PAGE
  );

  function handleUserSelect(userId: string) {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((u) => u !== userId) : [...prev, userId]
    );
    setCurrentSessionPage(1);
  }
  function handleFeedbackFilter(type: string | null) {
    setFeedbackFilterType(type === feedbackFilterType ? null : type);
    setCurrentSessionPage(1);
  }
  function handleDateFilter(date: string | null) { setDateFilterValue(date); setCurrentSessionPage(1); }
  function clearUserFilter() { setSelectedUsers([]); setCurrentSessionPage(1); }
  function clearDateFilter() { setDateFilterValue(null); setCurrentSessionPage(1); }
  function openModal(sessionId: string) { setSelectedSessionId(sessionId); setModalOpen(true); setCurrentPage(1); }
  function closeModal() { setModalOpen(false); setSelectedSessionId(null); setMessages([]); }

  useEffect(() => {
    if (!selectedSessionId) return;
    setChatLoading(true);
    let url = `/api/history/sessions/${selectedSessionId}/messages`;
    if (dateFilterValue) url += `?date=${dateFilterValue}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .finally(() => setChatLoading(false));
  }, [selectedSessionId, dateFilterValue]);

  const like = typeof feedbackStats.like_count === "string" ? parseInt(feedbackStats.like_count) : feedbackStats.like_count || 0;
  const dislike = typeof feedbackStats.dislike_count === "string" ? parseInt(feedbackStats.dislike_count) : feedbackStats.dislike_count || 0;
  const neutral = typeof feedbackStats.neutral_count === "string" ? parseInt(feedbackStats.neutral_count) : feedbackStats.neutral_count || 0;
  const total = like + dislike + neutral;
  const likePercent = total > 0 ? ((like / total) * 100).toFixed(2) : "0.00";
  const dislikePercent = total > 0 ? ((dislike / total) * 100).toFixed(2) : "0.00";
  const neutralPercent = total > 0 ? ((neutral / total) * 100).toFixed(2) : "0.00";

  const filteredUsers = useMemo(
    () => users.filter((u) => u.toLowerCase().includes(userSearch.toLowerCase())),
    [users, userSearch]
  );

  const totalMsgPages = Math.ceil(messages.length / MESSAGES_PER_PAGE) || 1;

  return (
    <div className="history-layout">

      {/* ===== SIDEBAR ===== */}
      <aside className="history-sidebar">

        {/* Feedback stats */}
        <div>
          <div className="sidebar-section-title">
            <span>📊</span> Feedback
          </div>

          <button
            className={`fb-btn fb-btn-total${feedbackFilterType === null ? " active" : ""}`}
            onClick={() => handleFeedbackFilter(null)}
          >
            <span className="fb-btn-label"><span>🏷️</span> Total</span>
            <span className="fb-btn-count">{total}</span>
          </button>

          <button
            className={`fb-btn fb-btn-like${feedbackFilterType === "like" ? " active" : ""}`}
            onClick={() => handleFeedbackFilter("like")}
          >
            <span className="fb-btn-label"><span>👍</span> Like</span>
            <span className="fb-btn-count-small">
              <div className="num">{like}</div>
              <div className="pct">({likePercent}%)</div>
            </span>
          </button>

          <button
            className={`fb-btn fb-btn-dislike${feedbackFilterType === "dislike" ? " active" : ""}`}
            onClick={() => handleFeedbackFilter("dislike")}
          >
            <span className="fb-btn-label"><span>👎</span> Dislike</span>
            <span className="fb-btn-count-small">
              <div className="num">{dislike}</div>
              <div className="pct">({dislikePercent}%)</div>
            </span>
          </button>

          <button
            className={`fb-btn fb-btn-neutral${feedbackFilterType === "neutral" ? " active" : ""}`}
            onClick={() => handleFeedbackFilter("neutral")}
          >
            <span className="fb-btn-label"><span>➖</span> Neutral</span>
            <span className="fb-btn-count-small">
              <div className="num">{neutral}</div>
              <div className="pct">({neutralPercent}%)</div>
            </span>
          </button>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

        {/* User filter */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="sidebar-filter-title">
            <span>🔍</span> Filter by User
          </div>
          <input
            type="text"
            className="sidebar-user-search"
            placeholder="พิมพ์หรือค้นหา user_id..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
          <div className="sidebar-user-list">
            {filteredUsers.length === 0 ? (
              <div className="sidebar-user-empty">No users found</div>
            ) : (
              filteredUsers.map((userId) => (
                <label
                  key={userId}
                  className={`sidebar-user-item${selectedUsers.includes(userId) ? " selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(userId)}
                    onChange={() => handleUserSelect(userId)}
                  />
                  <span>{userId}</span>
                </label>
              ))
            )}
          </div>
          <button className="btn-clear-filter" onClick={clearUserFilter}>
            Clear Filter
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <section className="history-main">
        {/* Header */}
        <div className="history-main-header">
          <div className="history-main-title">
            <span>🗂️</span> Contexts
          </div>
          <div className="history-date-row">
            <input
              type="date"
              className="history-date-input"
              value={dateFilterValue || ""}
              onChange={(e) => handleDateFilter(e.target.value || null)}
            />
            <button className="btn-clear-date" onClick={clearDateFilter}>
              Clear
            </button>
          </div>
        </div>

        {/* Session list */}
        {loading ? (
          <div className="history-empty">⏳ Loading...</div>
        ) : pagedSessions.length === 0 ? (
          <div className="history-empty">ไม่พบข้อมูล</div>
        ) : (
          pagedSessions.map((s) => (
            <div
              key={s.id}
              className="session-card"
              onClick={() => openModal(s.id)}
            >
              <div className="session-card-title">{extractContextText(s.summary_content)}</div>
              <div className="session-card-user">{s.user_id}</div>
              <div className="session-card-footer">
                <div className="session-card-badges">
                  <span className="badge badge-like">👍 {s.like_count}</span>
                  <span className="badge badge-dislike">👎 {s.dislike_count}</span>
                  <span className="badge badge-neutral">— {s.neutral_count}</span>
                </div>
                <div className="session-card-date">{formatDate(s.created_at)}</div>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        <div className="pagination">
          <button className="page-btn" disabled={currentSessionPage === 1} onClick={() => setCurrentSessionPage(1)}>⏮ First</button>
          <button className="page-btn" disabled={currentSessionPage === 1} onClick={() => setCurrentSessionPage((p) => Math.max(1, p - 1))}>← Prev</button>
          <span className="page-info">
            Page{" "}
            <input
              type="number"
              className="page-input"
              min={1}
              max={totalSessionPages}
              value={currentSessionPage}
              onChange={(e) =>
                setCurrentSessionPage(Math.max(1, Math.min(totalSessionPages, Number(e.target.value))))
              }
            />
            {" "}of {totalSessionPages}
          </span>
          <button className="page-btn" disabled={currentSessionPage === totalSessionPages} onClick={() => setCurrentSessionPage((p) => Math.min(totalSessionPages, p + 1))}>Next →</button>
          <button className="page-btn" disabled={currentSessionPage === totalSessionPages} onClick={() => setCurrentSessionPage(totalSessionPages)}>Last ⏭</button>
        </div>
      </section>

      {/* ===== MODAL ===== */}
      {modalOpen && (
        <div className="chat-modal-overlay" onClick={closeModal}>
          <div className="chat-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="chat-modal-close" onClick={closeModal}>×</button>

            <div className="chat-modal-title">💬 Messages</div>
            <div className="chat-modal-subtitle">
              {(() => {
                const s = sessions.find((s) => s.id === selectedSessionId);
                return s ? extractContextText(s.summary_content) : "";
              })()}
            </div>

            {/* Modal pagination */}
            <div className="pagination" style={{ justifyContent: "flex-start", marginBottom: 12, marginTop: 0 }}>
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>⏮</button>
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>← Prev</button>
              <span className="page-info">
                Page{" "}
                <input
                  type="number"
                  className="page-input"
                  min={1}
                  max={totalMsgPages}
                  value={currentPage}
                  onChange={(e) =>
                    setCurrentPage(Math.max(1, Math.min(totalMsgPages, Number(e.target.value))))
                  }
                />
                {" "}of {totalMsgPages} ({messages.length} messages)
              </span>
              <button className="page-btn" disabled={currentPage === totalMsgPages} onClick={() => setCurrentPage((p) => Math.min(totalMsgPages, p + 1))}>Next →</button>
              <button className="page-btn" disabled={currentPage === totalMsgPages} onClick={() => setCurrentPage(totalMsgPages)}>⏭</button>
            </div>

            {/* Messages */}
            <div className="chat-messages-scroll">
              {chatLoading ? (
                <div className="history-empty">⏳ Loading chat messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No chat messages found for this session.</div>
              ) : (() => {
                const pageMessages = messages.slice(
                  (currentPage - 1) * MESSAGES_PER_PAGE,
                  currentPage * MESSAGES_PER_PAGE
                );
                const paired: { question: Message | null; answer: Message | null }[] = [];
                let currentQ: Message | null = null;
                for (const msg of pageMessages) {
                  if (msg.role === "user") {
                    if (currentQ) paired.push({ question: currentQ, answer: null });
                    currentQ = msg;
                  } else if (msg.role === "assistant") {
                    if (currentQ) { paired.push({ question: currentQ, answer: msg }); currentQ = null; }
                    else paired.push({ question: null, answer: msg });
                  }
                }
                if (currentQ) paired.push({ question: currentQ, answer: null });

                return paired.map((pair, idx) => (
                  <div key={idx} className="qa-pair">
                    {pair.question && (
                      <div className="qa-row">
                        <span className="qa-label q">Q</span>
                        <span className="qa-text">
                          {pair.question.content}
                          <span className="qa-time">{formatDate(pair.question.created_at)}</span>
                        </span>
                      </div>
                    )}
                    {pair.answer && (
                      <div className="qa-row">
                        <span className="qa-label a">A</span>
                        <span className="qa-text">
                          {pair.answer.content}
                          <span className="qa-time">{formatDate(pair.answer.created_at)}</span>
                          {pair.answer.feedback && (
                            <span className={`feedback-badge ${pair.answer.feedback}`}>
                              {pair.answer.feedback === "like"
                                ? "👍 Like"
                                : pair.answer.feedback === "dislike"
                                ? "👎 Dislike"
                                : "➖ Neutral"}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}