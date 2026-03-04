"use client";

// Escape HTML output to prevent XSS
function escapeHtml(text: unknown): string {
  const str = (text === null || text === undefined) ? '' : String(text);
  return str.replace(/[&<>"']/g, function (m) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m] || '';
  });
}

import "./style.css";

// Helper to get value or fallback
function getValue(val: any, fallback: string = "-") {
  if (val === undefined || val === null || val === "") return fallback;
  return val;
}

// Format data for n8n webhook
function formatDataForN8n(page: string, data: any) {
  switch (page) {
    case "manual":
      return {
        json: {
          text: `\nหัวข้อ: ${getValue(data.topic)}\nเนื้อหา: ${getValue(data.chunk_content)}\nหมวดหมู่หลัก: ${getValue(data.category_main)}\nหมวดหมู่ย่อย: ${getValue(data.category_sub)}\nส่วนงาน/ระเบียบ: ${getValue(data.section)}\nชื่อเอกสาร: ${getValue(data.document_title)}\nประเภทข้อมูล: ${getValue(data.data_type)}\nFund: ${getValue(data.fund_abbr)}\nStep: ${getValue(data.step_number)}`.trim(),
          metadata: {
            chunk_id: data.chunk_id ?? null,
            document_title: data.document_title ?? null,
            category_main: data.category_main ?? null,
            type: "manual_guide",
          },
        },
      };
    default:
      return { json: data, metadata: { type: page } };
  }
}

import { useEffect, useState } from "react";

// --- Manual View Modal ---
function ManualViewModal({
  open,
  manual,
  onEdit,
  onClose,
}: {
  open: boolean;
  manual: Manual | null;
  onEdit: () => void;
  onClose: () => void;
}) {
  if (!open || !manual) return null;
  return (
    <div className="mini-modal-overlay">
      <div className="manual-view-modal">
        <h2>รายละเอียดคู่มือ</h2>
        <div className="manual-view-field"><b>ชื่อเอกสาร:</b><span>{escapeHtml(manual.document_title)}</span></div>
        <div className="manual-view-field"><b>หมวดหมู่หลัก:</b><span>{escapeHtml(manual.category_main)}</span></div>
        <div className="manual-view-field"><b>หมวดหมู่ย่อย:</b><span>{escapeHtml(manual.category_sub)}</span></div>
        <div className="manual-view-field"><b>Section:</b><span>{escapeHtml(manual.section)}</span></div>
        <div className="manual-view-field"><b>Step:</b><span>{escapeHtml(manual.step_number)}</span></div>
        <div className="manual-view-field"><b>หัวข้อเรื่อง:</b><span>{escapeHtml(manual.topic)}</span></div>
        <div className="manual-view-field"><b>เนื้อหา:</b><span>{escapeHtml(manual.chunk_content)}</span></div>
        <div className="manual-view-field"><b>ทุน:</b><span>{escapeHtml(manual.fund_abbr)}</span></div>
        <div className="manual-view-field"><b>ประเภทข้อมูล:</b><span>{escapeHtml(manual.data_type)}</span></div>
        <div className="mini-modal-actions" style={{ marginTop: 24 }}>
          <button className="modal-btn modal-btn-confirm" onClick={onEdit}>✏️ แก้ไข</button>
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>ปิด</button>
        </div>
      </div>
    </div>
  );
}

// --- Delete Confirm Modal ---
function DeleteConfirmModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="mini-modal-overlay">
      <div className="mini-modal-box" style={{ textAlign: "center" }}>
        <div className="modal-message">⚠️ คุณแน่ใจว่าต้องการลบเนื้อหาคู่มือนี้ใช่ไหม?</div>
        <div className="mini-modal-actions" style={{ justifyContent: "center" }}>
          <button
            className="modal-btn modal-btn-confirm"
            style={{ background: "var(--danger)", boxShadow: "none" }}
            onClick={onConfirm}
          >
            ยืนยัน
          </button>
          <button className="modal-btn modal-btn-cancel" onClick={onCancel}>
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Toast ---
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className="toast">{message}</div>;
}

// --- Types & Constants ---
type Manual = {
  chunk_id?: number;
  document_title: string;
  category_main: string;
  category_sub: string;
  step_number?: number | string | null;
  topic: string;
  chunk_content: string;
  fund_abbr?: string;
  section: string | null;
  data_type: string;
};

const initialManual: Manual = {
  document_title: "",
  category_main: "",
  category_sub: "",
  step_number: "",
  topic: "",
  chunk_content: "",
  fund_abbr: "",
  section: null,
  data_type: "guide",
};

export default function ManualPage() {
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewManual, setViewManual] = useState<Manual | null>(null);
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [form, setForm] = useState<Manual>(initialManual);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const dataTypeList = Array.from(new Set(manuals.map((m) => m.data_type).filter(Boolean)));
  const [tempSectionList, setTempSectionList] = useState<string[]>([]);
  const sectionList = Array.from(
    new Set([
      ...manuals
        .filter((m) => m.document_title === form.document_title)
        .map((m) => m.section)
        .filter(Boolean),
      ...tempSectionList,
    ])
  );

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [newSection, setNewSection] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [showForm, setShowForm] = useState<boolean>(false);


  const [fundList, setFundList] = useState<any[]>([]);
  const [categoryMainList, setCategoryMainList] = useState<string[]>([]);
  const [categorySubList, setCategorySubList] = useState<string[]>([]);

  const [categoryModalType, setCategoryModalType] = useState<"main" | "sub" | null>(null);
  const [categoryModalValue, setCategoryModalValue] = useState<string>("");
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ปิดฟอร์มและ modal เมื่อเปลี่ยนคู่มือ
  useEffect(() => {
    setShowForm(false);
    setEditingId(null);
    setShowSectionModal(false);
    setShowCategoryModal(false);
  }, [selectedTitle]);

  useEffect(() => {
    fetchManuals();
    fetch("/api/funds")
      .then((res) => res.json())
      .then((data) => setFundList(data))
      .catch(() => {});
  }, []);

  const fetchManuals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manuals");
      const data = await res.json();
      if (Array.isArray(data)) {
        setManuals(data);
        setCategoryMainList(
          Array.from(new Set(data.map((m: any) => m.category_main))).filter(Boolean) as string[]
        );
        setCategorySubList(
          Array.from(new Set(data.map((m: any) => m.category_sub))).filter(Boolean) as string[]
        );
      } else {
        setManuals([]);
        setCategoryMainList([]);
        setCategorySubList([]);
      }
    } catch {
      setToast("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (manual: Manual) => {
    setForm({ ...manual });
    setEditingId(manual.chunk_id ?? null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteManual = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/manuals`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunk_id: deleteId }),
      });
      setToast("ลบคู่มือสำเร็จ");
      fetchManuals();
    } catch {
      setToast("เกิดข้อผิดพลาด");
    } finally {
      setShowDeleteModal(false);
      setDeleteId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const confirmSubmitManual = async () => {
    setLoading(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const res = await fetch("/api/manuals", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, chunk_id: editingId } : form),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const savedManual = { ...form, chunk_id: data.chunk_id };
      try {
        const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formatDataForN8n("manual", savedManual)),
          });
        }
      } catch {}
      setToast("บันทึกสำเร็จ");
      fetchManuals();
      setShowForm(false);
    } catch {
      setToast("บันทึกไม่สำเร็จ");
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  const handleCategoryModalConfirm = () => {
    const newCat = categoryModalValue.trim();
    if (!newCat || !categoryModalType) return;
    if (categoryModalType === "main") {
      setCategoryMainList((prev) => (prev.includes(newCat) ? prev : [...prev, newCat]));
      setForm((prev) => ({ ...prev, category_main: newCat }));
    } else {
      setCategorySubList((prev) => (prev.includes(newCat) ? prev : [...prev, newCat]));
      setForm((prev) => ({ ...prev, category_sub: newCat }));
    }
    setShowCategoryModal(false);
    setCategoryModalValue("");
  };

  const manualTitles = Array.from(new Set(manuals.map((m) => m.document_title).filter(Boolean)));
  const filteredManuals = selectedTitle
    ? manuals.filter((m) => m.document_title === selectedTitle)
    : manuals;

  return (
    <main className="container">
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>จัดการเนื้อหาคู่มือ</h1>

      {/* Title filter buttons */}
      <div className="manual-title-bar">
        {manualTitles.map((title) => (
          <button
            key={title}
            className={`btn-title${selectedTitle === title ? " active" : ""}`}
            onClick={() => setSelectedTitle(title)}
          >
            {title}
          </button>
        ))}
        <button
          className="btn-ghost"
          onClick={() => {
            setShowForm(true);
            setForm(initialManual);
            setEditingId(null);
          }}
        >
          + เพิ่มคู่มือใหม่
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form className="manual-form" onSubmit={handleSubmit}>

          {/* เอกสาร */}
          <div className="form-section-title blue">📘 เอกสาร</div>
          <div className="form-group">
            <label>ชื่อเอกสาร <span className="required">*</span></label>
            <input
              name="document_title"
              value={form.document_title}
              onChange={handleChange}
              required
              readOnly={!!selectedTitle && (!editingId || form.document_title === selectedTitle)}
              disabled={!!selectedTitle && (!editingId || form.document_title === selectedTitle)}
              style={!!selectedTitle && (!editingId || form.document_title === selectedTitle) ? { background: '#f3f4f6', color: '#888', cursor: 'not-allowed' } : {}}
            />
          </div>

          {/* หมวดหมู่ */}
          <div className="form-section-title orange">🏷️ หมวดหมู่</div>
          <div className="form-col-2">
            <div className="form-group">
              <label>หมวดหมู่หลัก</label>
              <div className="select-add-row">
                <select name="category_main" value={form.category_main} onChange={handleChange}>
                  <option value="">-- เลือก --</option>
                  {categoryMainList.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-add-inline"
                  onClick={() => { setCategoryModalType("main"); setShowCategoryModal(true); }}
                >+</button>
              </div>
            </div>
            <div className="form-group">
              <label>หมวดหมู่ย่อย</label>
              <div className="select-add-row">
                <select name="category_sub" value={form.category_sub} onChange={handleChange}>
                  <option value="">-- เลือก --</option>
                  {categorySubList.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-add-inline"
                  onClick={() => { setCategoryModalType("sub"); setShowCategoryModal(true); }}
                >+</button>
              </div>
            </div>
          </div>

          {/* รายละเอียดเนื้อหา */}
          <div className="form-group">
            <label>หัวข้อเรื่อง <span className="required">*</span></label>
            <input name="topic" value={form.topic} onChange={handleChange} required placeholder="หัวข้อเรื่อง" />
          </div>
          <div className="form-group">
            <label>รายละเอียดเนื้อหา <span className="required">*</span></label>
            <textarea name="chunk_content" value={form.chunk_content} onChange={handleChange} required rows={6} />
          </div>

          {/* Data Type */}
          <div className="form-section-title red">📑 ประเภทข้อมูล</div>
          <div className="form-group">
            <label>Data Type</label>
            <div className="data-type-group">
              {dataTypeList.slice(0, 6).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`btn-data-type${form.data_type === type ? " active" : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, data_type: type }))}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Section */}
          <div className="form-group">
            <label>Section</label>
            <div className="select-add-row">
              <select
                name="section"
                value={form.section ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, section: e.target.value || null }))
                }
              >
                <option value="">-- เลือก Section --</option>
                {sectionList.map((section) => (
                  <option key={section} value={section ?? ""}>{section}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn-add-inline"
                onClick={() => setShowSectionModal(true)}
              >+</button>
            </div>
          </div>

          {/* Add Section Modal */}
          {showSectionModal && (
            <div className="mini-modal-overlay">
              <div className="mini-modal-box">
                <h2>เพิ่ม Section ใหม่</h2>
                <input
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  autoFocus
                />
                <div className="mini-modal-actions">
                  <button
                    type="button"
                    className="modal-btn modal-btn-confirm"
                    onClick={() => {
                      const trimmed = newSection.trim();
                      if (trimmed) {
                        setForm((prev) => ({ ...prev, section: trimmed }));
                        setTempSectionList((prev) =>
                          prev.includes(trimmed) ? prev : [...prev, trimmed]
                        );
                        setShowSectionModal(false);
                        setNewSection("");
                      }
                    }}
                  >
                    ตกลง
                  </button>
                  <button
                    type="button"
                    className="modal-btn modal-btn-cancel"
                    onClick={() => { setShowSectionModal(false); setNewSection(""); }}
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fund checkboxes */}
          <div className="form-section-title indigo">⚙️ ข้อมูลเพิ่มเติม (จำกัดทุน)</div>
          <div className="fund-checkbox-group">
            {fundList.map((fund) => (
              <label key={fund.fund_abbr} className="fund-checkbox-label">
                <input
                  type="checkbox"
                  checked={form.fund_abbr?.split(" ").includes(fund.fund_abbr) || false}
                  onChange={(e) => {
                    const abbrs = form.fund_abbr
                      ? form.fund_abbr.split(" ").filter(Boolean)
                      : [];
                    const newAbbrs = e.target.checked
                      ? [...abbrs, fund.fund_abbr]
                      : abbrs.filter((a) => a !== fund.fund_abbr);
                    setForm((prev) => ({ ...prev, fund_abbr: newAbbrs.join(" ") }));
                  }}
                />
                {fund.fund_abbr}
              </label>
            ))}
          </div>

          {/* Submit row */}
          <div className="form-submit-row" style={{ marginTop: 24 }}>
            <button type="submit" className="btn-save-primary" disabled={loading}>
              💾 บันทึกเนื้อหา
            </button>
            <button
              type="button"
              className="btn-cancel-secondary"
              onClick={() => setShowForm(false)}
            >
              ยกเลิก
            </button>
          </div>
              {/* Confirm Modal for Add/Edit */}
              {showConfirmModal && (
                <div className="mini-modal-overlay">
                  <div className="mini-modal-box" style={{ textAlign: "center" }}>
                    <div className="modal-message">คุณต้องการบันทึกข้อมูลนี้ใช่หรือไม่?</div>
                    <div className="mini-modal-actions" style={{ justifyContent: "center" }}>
                      <button
                        className="modal-btn modal-btn-confirm"
                        onClick={confirmSubmitManual}
                        disabled={loading}
                      >
                        ยืนยัน
                      </button>
                      <button
                        className="modal-btn modal-btn-cancel"
                        onClick={() => setShowConfirmModal(false)}
                        disabled={loading}
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                </div>
              )}
        </form>
      )}

      {/* Add step to current manual */}
      {selectedTitle && (
        <button
          className="btn-add-step"
          onClick={() => {
            setShowForm(true);
            setForm({ ...initialManual, document_title: selectedTitle });
            setEditingId(null);
          }}
        >
          + เพิ่มขั้นตอนใหม่ในคู่มือนี้
        </button>
      )}

      {/* Table */}
      <div className="manual-table-wrapper">
        <table className="manual-table">
          <thead>
            <tr>
              <th>ขั้นตอน</th>
              <th>หัวข้อเรื่อง</th>
              <th>เนื้อหา</th>
              <th>เฉพาะทุน</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredManuals.map((m) => (
              <tr key={m.chunk_id}>
                <td>{escapeHtml(m.step_number)}</td>
                <td style={{ fontWeight: 600 }}>{escapeHtml(m.topic)}</td>
                <td className="cell-truncate">{escapeHtml(m.chunk_content)}</td>
                <td>{escapeHtml(m.fund_abbr)}</td>
                <td className="cell-actions">
                  <button
                    title="ดูรายละเอียด"
                    onClick={() => { setViewManual(m); setShowViewModal(true); }}
                  >👁️</button>
                  <button title="แก้ไข" onClick={() => handleEdit(m)}>✏️</button>
                  <button
                    title="ลบ"
                    style={{ color: "var(--danger)" }}
                    onClick={() => m.chunk_id && handleDelete(m.chunk_id)}
                  >🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <ManualViewModal
        open={showViewModal}
        manual={viewManual}
        onEdit={() => {
          if (viewManual) handleEdit(viewManual);
          setShowViewModal(false);
        }}
        onClose={() => setShowViewModal(false)}
      />

      <DeleteConfirmModal
        open={showDeleteModal}
        onConfirm={confirmDeleteManual}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="mini-modal-overlay">
          <div className="mini-modal-box">
            <h2>
              เพิ่ม{categoryModalType === "main" ? "หมวดหมู่หลัก" : "หมวดหมู่ย่อย"}
            </h2>
            <input
              value={categoryModalValue}
              onChange={(e) => setCategoryModalValue(e.target.value)}
              autoFocus
            />
            <div className="mini-modal-actions">
              <button className="modal-btn modal-btn-confirm" onClick={handleCategoryModalConfirm}>
                ตกลง
              </button>
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowCategoryModal(false)}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </main>
  );
}