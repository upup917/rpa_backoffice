"use client";

import "./style.css";

// Helper to get value or fallback
function getValue(val: any, fallback: string = "-") {
  if (val === undefined || val === null || val === "") return fallback;
  return val;
}

// Format data for n8n webhook
function formatDataForN8n(page: string, data: any) {
  switch (page) {
    case "funds":
      return {
        json: {
          text: `\nรหัสทุน: ${getValue(data.fund_id)}\nชื่อย่อ: ${getValue(data.fund_abbr)}\nชื่อทุน (ไทย): ${getValue(data.fund_name_th)}\nชื่อทุน (อังกฤษ): ${getValue(data.fund_name_en)}\nแหล่งทุน: ${getValue(data.source_agency, "N/A")}\nปีงบประมาณ: ${getValue(data.fiscal_year)}\nระยะเวลา: ${getValue(data.start_period)} ถึง ${getValue(data.end_period)}\nสถานะ: ${getValue(data.status)}`.trim(),
          metadata: {
            source_id: data.fund_id || null,
            abbr: data.fund_abbr || null,
            agency: getValue(data.source_agency, "N/A"),
            year: data.fiscal_year || null,
            type: "fund_source",
          },
        },
      };
    default:
      return { json: data, metadata: { type: page } };
  }
}

import { useEffect, useState } from "react";

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className="toast">{message}</div>;
}

interface Fund {
  fund_id: string;
  fund_abbr: string;
  fund_name_th: string;
  fund_name_en?: string;
  fiscal_year?: number;
  source_agency?: string;
  start_period?: string;
  end_period?: string;
  status?: "enable" | "disable";
}

const initialForm: Fund = {
  fund_id: "",
  fund_abbr: "",
  fund_name_th: "",
  fund_name_en: "",
  fiscal_year: 2025,
  source_agency: "",
  start_period: "",
  end_period: "",
  status: "enable",
};

export default function FundsPage() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [filteredFunds, setFilteredFunds] = useState<Fund[]>([]);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Fund>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"save" | "delete">("save");
  const [toast, setToast] = useState("");
  const [affectedSteps, setAffectedSteps] = useState<any[] | null>(null);
  const [forceDelete, setForceDelete] = useState(false);

  const fetchFunds = async (search = "") => {
    try {
      const res = await fetch(`/api/funds?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setFunds(data);
      setFilteredFunds(data);
    } catch {
      setToast("เกิดข้อผิดพลาดในการดึงข้อมูลกองทุน");
    }
  };

  useEffect(() => {
    fetchFunds();
  }, []);

  const handleAddClick = () => {
    setShowForm(true);
    setForm(initialForm);
    setEditingId(null);
  };

  const handleEdit = (fund: Fund) => {
    setShowForm(true);
    setForm(fund);
    setEditingId(fund.fund_id);
  };

  const handleDelete = (fundId: string) => {
    setEditingId(fundId);
    setModalType("delete");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalType("save");
    setShowModal(true);
  };

  const confirmSave = async () => {
    try {
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(`/api/funds`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      let fundData = { ...form };
      if (!editingId) {
        const result = await res.json();
        fundData.fund_id = result.fund_id;
      } else {
        fundData.fund_id = editingId;
      }
      try {
        const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formatDataForN8n("funds", fundData)),
          });
        }
      } catch {}
      setToast("บันทึกข้อมูลสำเร็จ");
      setShowForm(false);
      setForm(initialForm);
      setEditingId(null);
      fetchFunds();
    } catch {
      setToast("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
    setShowModal(false);
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch("/api/funds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fund_id: editingId, force: forceDelete }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setAffectedSteps(data.steps || []);
        setForceDelete(true);
        setToast("กองทุนนี้ถูกใช้ในคู่มือ/ขั้นตอน หากลบจะมีผลกับขั้นตอนที่เกี่ยวข้อง");
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      setToast("ลบข้อมูลสำเร็จ");
      setEditingId(null);
      setAffectedSteps(null);
      setForceDelete(false);
      fetchFunds(filter);
    } catch {
      setToast("เกิดข้อผิดพลาดในการลบข้อมูล");
    }
    setShowModal(false);
    setShowForm(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setAffectedSteps(null);
    setForceDelete(false);
  };

  return (
    <div className="funds-page">

      {/* Page Header */}
      <div className="page-header">
        <h1>จัดการข้อมูลลูกกองทุนวิจัย</h1>
        <button className="btn-ghost" onClick={handleAddClick}>
          + เพิ่มกองทุนใหม่
        </button>
      </div>

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h2>{editingId ? "แก้ไขกองทุน" : "เพิ่มกองทุนใหม่"}</h2>
            <form onSubmit={handleSubmit} style={{ all: "unset", display: "contents" }}>

              <div className="form-group">
                <label htmlFor="fund_abbr">ชื่อย่อทุน (Abbr)</label>
                <input
                  type="text"
                  id="fund_abbr"
                  placeholder="เช่น TSRI"
                  value={form.fund_abbr || ""}
                  onChange={(e) => setForm({ ...form, fund_abbr: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fund_name_th">ชื่อกองทุน (TH)</label>
                <input
                  type="text"
                  id="fund_name_th"
                  placeholder="ชื่อกองทุนภาษาไทย"
                  value={form.fund_name_th || ""}
                  onChange={(e) => setForm({ ...form, fund_name_th: e.target.value })}
                />
              </div>

              <div className="form-col-2">
                <div className="form-group">
                  <label htmlFor="fund_name_en">ชื่อกองทุน (EN)</label>
                  <input
                    type="text"
                    id="fund_name_en"
                    placeholder="ชื่อกองทุนภาษาอังกฤษ"
                    value={form.fund_name_en || ""}
                    onChange={(e) => setForm({ ...form, fund_name_en: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fiscal_year">ปีงบประมาณ</label>
                  <input
                    type="number"
                    id="fiscal_year"
                    placeholder="ปีงบประมาณ"
                    value={form.fiscal_year || ""}
                    onChange={(e) => setForm({ ...form, fiscal_year: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-col-2">
                <div className="form-group">
                  <label htmlFor="source_agency">หน่วยงาน (Source Agency)</label>
                  <input
                    type="text"
                    id="source_agency"
                    placeholder="เช่น สกสว. (TSRI)"
                    value={form.source_agency || ""}
                    onChange={(e) => setForm({ ...form, source_agency: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="status">สถานะ</label>
                  <select
                    id="status"
                    value={form.status || "enable"}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as "enable" | "disable" })
                    }
                  >
                    <option value="enable">Enable (เปิดใช้งาน)</option>
                    <option value="disable">Disable (ปิดใช้งาน)</option>
                  </select>
                </div>
              </div>

              <div className="form-col-2">
                <div className="form-group">
                  <label htmlFor="start_period">วันเริ่มต้น</label>
                  <input
                    type="date"
                    id="start_period"
                    value={form.start_period ? form.start_period.slice(0, 10) : ""}
                    onChange={(e) => setForm({ ...form, start_period: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="end_period">วันสิ้นสุด</label>
                  <input
                    type="date"
                    id="end_period"
                    value={form.end_period ? form.end_period.slice(0, 10) : ""}
                    onChange={(e) => setForm({ ...form, end_period: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-buttons">
                <button type="submit" className="modal-btn modal-btn-confirm">บันทึก</button>
                <button
                  type="button"
                  className="modal-btn modal-btn-cancel"
                  onClick={() => { setShowForm(false); setForm(initialForm); setEditingId(null); }}
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Save / Delete Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 480, textAlign: "center" }}>
            <div className="modal-message">
              {modalType === "delete" ? (
                affectedSteps && affectedSteps.length > 0 ? (
                  <>
                    <div className="affected-steps-warning">
                      ⚠️ คำเตือน: กองทุนนี้ถูกใช้ในขั้นตอนของคู่มือ
                    </div>
                    <div style={{ fontSize: 14, marginBottom: 8 }}>ขั้นตอนที่ได้รับผลกระทบ:</div>
                    <ul className="affected-steps-list">
                      {affectedSteps.map((step, idx) => (
                        <li key={step.chunk_id || idx}>
                          {step.document_title} - ขั้นตอน {step.step_number}
                          {step.topic ? `: ${step.topic}` : ""}
                        </li>
                      ))}
                    </ul>
                    <div className="affected-steps-detail">
                      หากลบกองทุนนี้:<br />
                      - ขั้นตอนที่มีเฉพาะกองทุนนี้จะถูกลบออกจากคู่มือ<br />
                      - ขั้นตอนที่มีหลายกองทุนจะลบกองทุนนี้ออกจากขั้นตอนนั้น
                    </div>
                    <div className="affected-steps-confirm">คุณต้องการดำเนินการต่อหรือไม่?</div>
                  </>
                ) : (
                  <span>⚠️ คุณแน่ใจว่าต้องการลบกองทุนนี้ใช่ไหม?</span>
                )
              ) : (
                <span>💾 คุณแน่ใจว่าต้องการบันทึกข้อมูลใช่ไหม?</span>
              )}
            </div>
            <div className="modal-buttons" style={{ justifyContent: "center" }}>
              <button
                className="modal-btn modal-btn-confirm"
                style={modalType === "delete" ? { background: "var(--danger)", boxShadow: "none" } : {}}
                onClick={modalType === "delete" ? confirmDelete : confirmSave}
              >
                ยืนยัน
              </button>
              <button className="modal-btn modal-btn-cancel" onClick={closeModal}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter / Search bar */}
      <div className="funds-filter-bar">
        <input
          type="text"
          placeholder="ค้นหาชื่อทุน / หน่วยงาน"
          value={filter}
          onChange={(e) => {
            const search = e.target.value;
            setFilter(search);
            fetchFunds(search);
          }}
        />
        <div className="funds-filter-btns">
          <button className="btn-filter-all" onClick={() => { setFilter(""); fetchFunds(); }}>
            📋 ทั้งหมด
          </button>
          <button className="btn-filter-enable" onClick={() => fetchFunds(`${filter} status:enable`)}>
            Enable
          </button>
          <button className="btn-filter-disable" onClick={() => fetchFunds(`${filter} status:disable`)}>
            Disable
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ชื่อย่อทุน</th>
              <th>ชื่อกองทุน (TH)</th>
              <th>ปีงบฯ</th>
              <th>หน่วยงาน</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredFunds.length === 0 ? (
              <tr><td colSpan={6}>ไม่พบข้อมูล</td></tr>
            ) : (
              filteredFunds.map((fund) => (
                <tr key={fund.fund_id}>
                  <td>{fund.fund_abbr}</td>
                  <td>{fund.fund_name_th}</td>
                  <td>{fund.fiscal_year || "-"}</td>
                  <td>{fund.source_agency || "-"}</td>
                  <td>
                    {fund.status === "enable" ? (
                      <span className="status-badge enable">🟢 Enable</span>
                    ) : (
                      <span className="status-badge disable">🔴 Disable</span>
                    )}
                  </td>
                  <td>
                    <button className="btn-icon" title="แก้ไข" onClick={() => handleEdit(fund)}>✏️</button>
                    <button className="btn-icon" title="ลบ" style={{ color: "var(--danger)" }} onClick={() => handleDelete(fund.fund_id)}>🗑</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}