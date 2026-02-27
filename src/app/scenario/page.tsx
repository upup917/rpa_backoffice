"use client";

import "./style.css";
import { useEffect, useState } from "react";

// Helper to get value or fallback
function getValue(val: any, fallback: string = "-") {
  if (val === undefined || val === null || val === "") return fallback;
  return val;
}

// Format data for n8n webhook
function formatDataForN8n(page: string, data: any) {
  switch (page) {
    case "scenario":
      return {
        json: {
          text: `\nScenario: ${getValue(data.scenario)}\nSolution: ${getValue(data.solution)}\nTag: ${getValue(data.tag)}`.trim(),
          metadata: {
            parent_id: data.id || null,
            type: "support_story",
          },
        },
      };
    default:
      return { json: data, metadata: { type: page } };
  }
}

// Toast component
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className="toast">{message}</div>;
}

interface Scenario {
  id: number;
  scenario_name: string;
  tag: string;
  scenario: string;
  solution: string;
}

export default function ScenarioPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Scenario>({
    id: 0,
    scenario_name: "",
    tag: "",
    scenario: "",
    solution: "",
  });
  const [toast, setToast] = useState<string>("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [scenarioSearch, setScenarioSearch] = useState("");
  const [scenarioSuggestions, setScenarioSuggestions] = useState<Scenario[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalScenario, setModalScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    type: "delete" | "save" | null;
    data?: any;
  }>({ type: null });

  useEffect(() => {
    fetchScenarios({ search, tagFilter });
  }, [search, tagFilter]);

  const fetchScenarios = async ({
    search,
    tagFilter,
  }: {
    search: string;
    tagFilter: string;
  }) => {
    setLoading(true);
    let url = "/api/scenarios";
    const params = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (tagFilter) params.push(`tag=${encodeURIComponent(tagFilter)}`);
    if (params.length) url += `?${params.join("&")}`;
    const res = await fetch(url);
    let data = await res.json();
    if (!Array.isArray(data)) data = [];
    setScenarios(data);
    setLoading(false);
  };

  const handleAddClick = () => {
    setShowForm(true);
    setEditingId(null);
    setForm({ id: 0, scenario_name: "", tag: "", scenario: "", solution: "" });
  };

  const handleEdit = (scenario: Scenario) => {
    setShowForm(true);
    setEditingId(scenario.id);
    setForm({ ...scenario });
  };

  const handleView = (scenario: Scenario) => {
    setModalScenario(scenario);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setConfirmModal({ type: "save", data: { ...form, id: editingId } });
  };

  const confirmSave = async () => {
    try {
      let scenarioId = editingId;
      if (editingId) {
        await fetch("/api/scenarios", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, id: editingId }),
        });
        setToast("แก้ไข scenario สำเร็จ");
      } else {
        const res = await fetch("/api/scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        setToast("เพิ่ม scenario สำเร็จ");
        if (res.ok) {
          const result = await res.json();
          scenarioId = result.id;
        }
      }
      // Call n8n webhook after save
      try {
        const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              formatDataForN8n("scenario", {
                ...form,
                id: scenarioId || form.id,
              })
            ),
          });
        }
      } catch {}
      setShowForm(false);
      setForm({ id: 0, scenario_name: "", tag: "", scenario: "", solution: "" });
      setEditingId(null);
      setConfirmModal({ type: null });
      fetchScenarios({ search, tagFilter });
    } catch {
      setToast("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmModal({ type: "delete", data: id });
  };

  const confirmDelete = async () => {
    if (!confirmModal.data) return;
    await fetch("/api/scenarios", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: confirmModal.data }),
    });
    setToast("ลบ scenario สำเร็จ");
    setConfirmModal({ type: null });
    fetchScenarios({ search, tagFilter });
  };

  // Unique tags
  const tagOptions = Array.from(
    new Set([
      ...scenarios.map((s) => s.tag),
      form.tag && !scenarios.some((s) => s.tag === form.tag) ? form.tag : null,
    ])
  ).filter((t): t is string => typeof t === "string" && t.trim() !== "");

  // Autocomplete suggestions
  useEffect(() => {
    if (scenarioSearch.length > 0) {
      setScenarioSuggestions(
        scenarios.filter((s) =>
          s.scenario_name.toLowerCase().includes(scenarioSearch.toLowerCase())
        )
      );
    } else {
      setScenarioSuggestions([]);
    }
  }, [scenarioSearch, scenarios]);

  return (
    <main className="container">
      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      {/* Page Header */}
      <div className="page-header">
        <h1>Chatbot Scenario</h1>
        <button className="btn-ghost" onClick={handleAddClick}>
          + Add New Scenario
        </button>
      </div>

      {/* Main Card */}
      <div className="card">
        {/* Card Header: title + search + filter */}
        <div className="card-header">
          <h2>กรอกข้อมูลสถานการณ์</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="text"
              className="search-box"
              placeholder="ค้นหาสถานการณ์..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="btn-filter"
            >
              <option value="">📋 ทั้งหมด</option>
              {tagOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Add / Edit Form Modal */}
        {showForm && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <h2>{editingId ? "แก้ไขสถานการณ์" : "เพิ่มสถานการณ์ใหม่"}</h2>
              <form onSubmit={handleSubmit} style={{ all: "unset", display: "contents" }}>
                <div className="form-row">
                  {/* Scenario Name */}
                  <div className="form-group" style={{ maxWidth: 360 }}>
                    <label>
                      ชื่อสถานการณ์ <span className="required">*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={form.scenario_name ?? ""}
                        onChange={(e) => {
                          setForm({ ...form, scenario_name: e.target.value });
                          setScenarioSearch(e.target.value);
                        }}
                        placeholder="ค้นหาหรือกรอกชื่อสถานการณ์"
                        autoComplete="off"
                        required
                      />
                      {scenarioSearch && scenarioSuggestions.length > 0 && (
                        <ul className="autocomplete-list">
                          {scenarioSuggestions.map((s) => (
                            <li
                              key={s.id}
                              onClick={() => {
                                setShowForm(true);
                                setEditingId(s.id);
                                setForm({ ...s });
                                setScenarioSearch("");
                              }}
                            >
                              {s.scenario_name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Tag */}
                  <div className="form-group" style={{ maxWidth: 280 }}>
                    <label>
                      ป้ายกำกับ (Tag) <span className="required">*</span>
                    </label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {!showTagInput ? (
                        <>
                          <select
                            value={form.tag ?? ""}
                            onChange={(e) =>
                              setForm({ ...form, tag: e.target.value })
                            }
                            required
                          >
                            <option value="">-- เลือกป้ายกำกับ --</option>
                            {tagOptions.map((tag) => (
                              <option key={tag} value={tag}>
                                {tag}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn-icon"
                            title="เพิ่ม Tag"
                            onClick={() => setShowTagInput(true)}
                          >
                            ➕
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="เพิ่มป้ายกำกับใหม่"
                          />
                          <button
                            type="button"
                            className="btn-icon"
                            title="บันทึก Tag"
                            onClick={() => {
                              if (newTag.trim()) {
                                setForm({ ...form, tag: newTag.trim() });
                                setShowTagInput(false);
                                setNewTag("");
                              }
                            }}
                          >
                            ✔️
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            title="ยกเลิก"
                            onClick={() => {
                              setShowTagInput(false);
                              setNewTag("");
                            }}
                          >
                            ✖️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scenario */}
                <div className="form-group">
                  <label>
                    Scenario <span className="required">*</span>
                  </label>
                  <textarea
                    value={form.scenario ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, scenario: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Solution */}
                <div className="form-group">
                  <label>
                    Solution <span className="required">*</span>
                  </label>
                  <textarea
                    value={form.solution ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, solution: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="modal-buttons">
                  <button type="submit" className="modal-btn modal-btn-confirm">
                    บันทึกสถานการณ์
                  </button>
                  <button
                    type="button"
                    className="modal-btn modal-btn-cancel"
                    onClick={() => setShowForm(false)}
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Delete / Save Modal */}
        {confirmModal.type && (
          <div className="modal-overlay">
            <div className="modal-dialog" style={{ maxWidth: 400, textAlign: "center" }}>
              <div className="modal-message">
                {confirmModal.type === "delete"
                  ? "⚠️ คุณแน่ใจว่าต้องการลบสถานการณ์นี้ใช่ไหม?"
                  : "💾 คุณแน่ใจว่าต้องการบันทึกข้อมูลใช่ไหม?"}
              </div>
              <div className="modal-buttons" style={{ justifyContent: "center" }}>
                <button
                  className="modal-btn modal-btn-confirm"
                  style={
                    confirmModal.type === "delete"
                      ? { background: "var(--danger)", boxShadow: "none" }
                      : {}
                  }
                  onClick={
                    confirmModal.type === "delete" ? confirmDelete : confirmSave
                  }
                >
                  ยืนยัน
                </button>
                <button
                  className="modal-btn modal-btn-cancel"
                  onClick={() => setConfirmModal({ type: null })}
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Detail Modal */}
        {showModal && modalScenario && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <div className="modal-message">
                <h2>รายละเอียดสถานการณ์</h2>
                <div className="modal-field">
                  <label>ชื่อสถานการณ์:</label>
                  <span>{modalScenario.scenario_name}</span>
                </div>
                <div className="modal-field">
                  <label>ป้ายกำกับ:</label>
                  <span>{modalScenario.tag}</span>
                </div>
                <div className="modal-field">
                  <label>Scenario:</label>
                  <span>{modalScenario.scenario}</span>
                </div>
                <div className="modal-field">
                  <label>Solution:</label>
                  <span>{modalScenario.solution}</span>
                </div>
              </div>
              <div className="modal-buttons">
                <button
                  className="modal-btn modal-btn-confirm"
                  onClick={() => {
                    setShowModal(false);
                    handleEdit(modalScenario);
                  }}
                >
                  ✏️ แก้ไข
                </button>
                <button
                  className="modal-btn modal-btn-cancel"
                  style={{ background: "var(--danger)", color: "white" }}
                  onClick={() => {
                    setShowModal(false);
                    handleDelete(modalScenario.id);
                  }}
                >
                  🗑 ลบ
                </button>
                <button
                  className="modal-btn modal-btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="table-section">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "22%" }}>ชื่อสถานการณ์</th>
                <th style={{ width: "18%" }}>ป้ายกำกับ</th>
                <th style={{ width: "45%" }}>Scenario</th>
                <th style={{ width: "15%" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4}>⏳ กำลังโหลด...</td>
                </tr>
              ) : scenarios.length === 0 ? (
                <tr>
                  <td colSpan={4}>ไม่พบข้อมูล</td>
                </tr>
              ) : (
                scenarios.map((s) => (
                  <tr key={s.id}>
                    <td>{s.scenario_name}</td>
                    <td>{s.tag}</td>
                    <td>{s.scenario}</td>
                    <td>
                      <button
                        className="btn-icon"
                        title="ดูรายละเอียด"
                        onClick={() => handleView(s)}
                      >
                        👁️
                      </button>
                      <button
                        className="btn-icon"
                        title="แก้ไข"
                        onClick={() => handleEdit(s)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon"
                        title="ลบ"
                        style={{ color: "var(--danger)" }}
                        onClick={() => handleDelete(s.id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}