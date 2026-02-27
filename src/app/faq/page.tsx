"use client";

import "./style.css";
import { useEffect, useState } from "react";

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className="toast">{message}</div>;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"delete" | "save" | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    fetch("/api/faqs")
      .then((res) => res.json())
      .then((data) => setFaqs(data));
  }, []);

  const handleAddClick = () => {
    setShowForm(!showForm);
    setEditingId(null);
    setForm({ question: "", answer: "" });
  };

  const handleEdit = (faq: FAQ) => {
    setShowForm(true);
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer });
  };

  const handleDelete = (id: number) => {
    setModalType("delete");
    setModalData(id);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!modalData) return;
    await fetch("/api/faqs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: modalData }),
    });
    setFaqs(faqs.filter((f) => f.id !== modalData));
    setShowModal(false);
    setModalType(null);
    setModalData(null);
    setToast("ลบคำถามสำเร็จ");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalType("save");
    setModalData(form);
    setShowModal(true);
  };

  const confirmSave = async () => {
    if (!modalData) return;
    let res;
    if (editingId) {
      res = await fetch("/api/faqs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...modalData }),
      });
      if (res.ok) {
        setFaqs(faqs.map((f) => (f.id === editingId ? { ...f, ...modalData } : f)));
        setShowForm(false);
        setEditingId(null);
        setForm({ question: "", answer: "" });
        setToast("แก้ไขข้อมูลสำเร็จ");
      }
    } else {
      res = await fetch("/api/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modalData),
      });
      if (res.ok) {
        const newFaq: FAQ = await res.json();
        setFaqs([...faqs, newFaq]);
        setShowForm(false);
        setForm({ question: "", answer: "" });
        setToast("เพิ่มคำถามสำเร็จ");
      }
    }
    setShowModal(false);
    setModalType(null);
    setModalData(null);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ question: "", answer: "" });
  };

  return (
    <main className="container">
      {/* Page Header */}
      <div className="page-header">
        <h1>จัดการคำถาม FAQ</h1>
        <button className="btn-ghost" onClick={handleAddClick}>
          + เพิ่มคำถามใหม่
        </button>
      </div>

      {/* Main Card with Table */}
      <div className="card">
        <div className="card-header">
          <h2>รายการคำถาม FAQ</h2>
        </div>
        <div className="table-section">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "35%" }}>คำถาม</th>
                <th style={{ width: "50%" }}>คำตอบ</th>
                <th style={{ width: "15%" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {faqs.length === 0 ? (
                <tr><td colSpan={3}>ไม่พบข้อมูล</td></tr>
              ) : (
                faqs.map((faq) => (
                  <tr key={faq.id}>
                    <td style={{ fontWeight: 500 }}>{faq.question}</td>
                    <td className="cell-truncate">{faq.answer}</td>
                    <td className="cell-actions">
                      <button className="btn-icon" title="แก้ไข" onClick={() => handleEdit(faq)}>✏️</button>
                      <button className="btn-icon" title="ลบ" style={{ color: "var(--danger)" }} onClick={() => handleDelete(faq.id)}>🗑</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h2>{editingId ? "แก้ไขคำถาม" : "เพิ่มคำถามใหม่"}</h2>
            <form onSubmit={handleSubmit} style={{ all: "unset", display: "contents" }}>
              <div className="form-group">
                <label htmlFor="faqQuestion">คำถาม <span className="required">*</span></label>
                <input
                  type="text"
                  id="faqQuestion"
                  placeholder="ใส่คำถาม"
                  required
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="faqAnswer">คำตอบ <span className="required">*</span></label>
                <textarea
                  id="faqAnswer"
                  rows={6}
                  placeholder="ใส่คำตอบ"
                  required
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="modal-btn modal-btn-confirm">
                  {editingId ? "บันทึกการแก้ไข" : "บันทึกคำถาม"}
                </button>
                <button type="button" className="modal-btn modal-btn-cancel" onClick={closeModal}>
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Save / Delete Modal */}
      {showModal && (modalType === "delete" || modalType === "save") && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 400, textAlign: "center" }}>
            <div className="modal-message">
              {modalType === "delete"
                ? "⚠️ คุณแน่ใจว่าต้องการลบคำถามนี้ใช่ไหม?"
                : "💾 คุณแน่ใจว่าต้องการบันทึกการแก้ไขใช่ไหม?"}
            </div>
            <div className="modal-buttons" style={{ justifyContent: "center" }}>
              <button
                className="modal-btn modal-btn-confirm"
                style={modalType === "delete" ? { background: "var(--danger)", boxShadow: "none" } : {}}
                onClick={modalType === "delete" ? confirmDelete : confirmSave}
              >
                ยืนยัน
              </button>
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => { setShowModal(false); setModalType(null); setModalData(null); }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Preview Section */}
      <section className="faq-chat-preview" aria-labelledby="faqPreviewTitle">
        <div className="faq-chat-preview-header">
          <h2 id="faqPreviewTitle">ตัวอย่างตำแหน่ง FAQ ในหน้า Chat</h2>
          <span className="faq-chat-preview-note">Mock ให้เหมือนหน้าจริง</span>
        </div>
        <div className="chat-mock-stage">
          <div className="chat-mock-window">
            {/* Top bar */}
            <div className="chat-mock-topbar">
              <div className="chat-mock-brand">
                <img
                  className="chat-mock-logo"
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-OfxGJfH_KKInQNFbbR1XKY7ePT-L1TBKTw&s"
                  alt="PSU Logo"
                />
                <strong>RPA Chatbot</strong>
              </div>
              <div className="chat-mock-actions">
                <span className="chat-mock-help">?</span>
                <span className="chat-mock-clear">⏻ ล้างการสนทนา</span>
              </div>
            </div>

            {/* Bot message */}
            <div className="chat-mock-body">
              <div className="chat-mock-message">
                สวัสดีครับ มีเรื่องสงสัยเกี่ยวกับ RPA หรือการเบิกจ่าย สอบถามผมได้เลยครับ 👇
              </div>
            </div>

            {/* FAQ chips */}
            <div className="chat-mock-faq-zone">
              <span className="faq-zone-tag">ตำแหน่งที่ FAQ จะแสดง</span>
              <div className="chat-mock-chips">
                {faqs.slice(0, 3).map((faq) => (
                  <span className="chip" key={faq.id}>{faq.question}</span>
                ))}
              </div>
            </div>

            {/* Input row */}
            <div className="chat-mock-input-row">
              <div className="chat-mock-input">พิมพ์คำถามของคุณที่นี่...</div>
              <button type="button" className="chat-mock-send" aria-label="ส่งข้อความ">➤</button>
            </div>

            <div className="chat-mock-footer">RPA Chatbot, PSU</div>
          </div>
        </div>
      </section>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </main>
  );
}