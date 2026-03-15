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
import { useEffect, useState } from "react";
import { apiUrl } from "../_lib/basePath";

// Helper to get value or fallback
function getValue(val: any, fallback: string = "-") {
	if (val === undefined || val === null || val === "") return fallback;
	return val;
}

// Format data for n8n webhook
function formatDataForN8n(page: string, data: any) {
	switch (page) {
		case "terms":
			return {
				json: {
					text: `คำศัพท์: ${getValue(data.word)}
ความหมาย: ${getValue(data.meaning)}
ประเภท: ${getValue(data.word_type)}
รหัสคำศัพท์: ${getValue(data.word_id)}`,
					metadata: {
						word_id: data.word_id || null,
						word: data.word || null,
						word_type: data.word_type || "general",
						type: "glossary",
					},
				},
			};
		default:
			return { json: data, metadata: { type: page } };
	}
}

interface Term {
	word_id: string;
	word: string;
	meaning: string;
	word_type: string;
}

export default function TermsPage() {
	const [terms, setTerms] = useState<Term[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState<Omit<Term, "word_id">>({
		word: "",
		meaning: "",
		word_type: "",
	});
	const [editingId, setEditingId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(false);
	const [confirmModal, setConfirmModal] = useState<{
		type: "delete" | "save" | null;
		data?: any;
	}>({ type: null });
	const [types, setTypes] = useState<string[]>([]);
	const [showTypeInput, setShowTypeInput] = useState(false);
	const [newType, setNewType] = useState("");

	useEffect(() => {
		fetchTerms();
	}, [search]);

	async function fetchTerms() {
		setLoading(true);
		try {
			const res = await fetch(apiUrl(`/api/terms?search=${encodeURIComponent(search)}`));
			const data = await res.json();
			setTerms(data.terms || []);
			setTypes(data.types || []);
		} catch {
			setTerms([]);
		} finally {
			setLoading(false);
		}
	}

	const handleAddClick = () => {
		setShowForm(true);
		setForm({ word: "", meaning: "", word_type: "" });
		setEditingId(null);
	};

	const handleEdit = (term: Term) => {
		setShowForm(true);
		setForm({
			word: term.word,
			meaning: term.meaning,
			word_type: term.word_type,
		});
		setEditingId(term.word_id);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setConfirmModal({ type: "save" });
	};

	const confirmSave = async () => {
		try {
			let wordIdToSend = editingId;

			if (editingId) {
				await fetch(apiUrl("/api/terms"), {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ...form, word_id: editingId }),
				});
			} else {
				const res = await fetch(apiUrl("/api/terms"), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(form),
				});
				if (res.ok) {
					const data = await res.json();
					if (data.word_id) wordIdToSend = data.word_id;
				}
			}

			// Call webhook
			try {
				const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
				if (webhookUrl) {
					await fetch(webhookUrl, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(
							formatDataForN8n("terms", {
								...form,
								word_id: wordIdToSend,
							})
						),
					});
				}
			} catch {}

			setShowForm(false);
			setForm({ word: "", meaning: "", word_type: "" });
			setEditingId(null);
			setConfirmModal({ type: null });
			fetchTerms();
		} catch {}
	};

	const handleDelete = (word_id: string) => {
		setConfirmModal({ type: "delete", data: word_id });
	};

	const confirmDelete = async () => {
		if (!confirmModal.data) return;
		await fetch(apiUrl("/api/terms"), {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ word_id: confirmModal.data }),
		});
		setConfirmModal({ type: null });
		fetchTerms();
	};

	return (
		<main className="container">
			{/* Page Header */}
			<div className="top-bar">
				<h1>Terms Management</h1>
				<button className="btn-add" onClick={handleAddClick}>
					+ Add New Term
				</button>
			</div>

			{/* Search Bar */}
			<div className="search-bar">
				<input
					type="text"
					placeholder="ค้นหาคำศัพท์..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					style={{ maxWidth: 360 }}
				/>
			</div>

			{/* Add / Edit Form */}
			{showForm && (
				<div className="form-card">
					<h2>{editingId ? "แก้ไขคำศัพท์" : "เพิ่มคำศัพท์ใหม่"}</h2>
					<form onSubmit={handleSubmit} style={{ padding: 0, border: "none", boxShadow: "none", background: "none", animation: "none" }}>
						<input
							type="text"
							placeholder="คำศัพท์"
							value={form.word}
							onChange={(e) => setForm({ ...form, word: e.target.value })}
							required
						/>
						<input
							type="text"
							placeholder="ความหมาย"
							value={form.meaning}
							onChange={(e) => setForm({ ...form, meaning: e.target.value })}
							required
						/>
						{!showTypeInput ? (
							<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
								<select
									value={form.word_type}
									onChange={e => setForm({ ...form, word_type: e.target.value })}
									required
									style={{ minWidth: 120, maxWidth: 180, width: 'auto', padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
								>
									<option value="">-- เลือกประเภท --</option>
									{types.map(type => (
										<option key={type} value={type}>{type}</option>
									))}
									{form.word_type && !types.includes(form.word_type) && (
										<option value={form.word_type}>{form.word_type}</option>
									)}
								</select>
								<button type="button" onClick={() => setShowTypeInput(true)} style={{ border: '1px solid #7c3aed', background: '#fff', color: '#7c3aed', borderRadius: 8, width: 36, height: 36, fontSize: 20, marginLeft: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
							</div>
						) : (
							<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
								<input
									type="text"
									value={newType}
									onChange={e => setNewType(e.target.value)}
									placeholder="เพิ่มประเภทใหม่"
									style={{ width: 180, minWidth: 100, maxWidth: 220 }}
								/>
								<button
									type="button"
									onClick={() => {
										const trimmed = newType.trim();
										if (trimmed) {
											setTypes(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
											setForm(prev => ({ ...prev, word_type: trimmed }));
											setShowTypeInput(false);
											setNewType("");
										}
									}}
									style={{ background: '#22c55e', color: '#fff', borderRadius: 8, padding: '0 16px', border: 'none', fontWeight: 'bold', fontSize: 18, display: 'flex', alignItems: 'center', gap: 4 }}
								>
									<span style={{ fontSize: 20 }}>✔️</span> <span>เพิ่ม</span>
								</button>
								<button
									type="button"
									onClick={() => { setShowTypeInput(false); setNewType(""); }}
									style={{ background: '#ef4444', color: '#fff', borderRadius: 8, padding: '0 16px', border: 'none', fontWeight: 'bold', fontSize: 18, display: 'flex', alignItems: 'center', gap: 4 }}
								>
									<span style={{ fontSize: 20 }}>✖️</span> <span>ยกเลิก</span>
								</button>
							</div>
						)}
						<div className="form-actions">
							<button type="submit">บันทึก</button>
							<button
								type="button"
								className="btn-cancel"
								onClick={() => setShowForm(false)}
							>
								ยกเลิก
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Confirm Modal */}
			{confirmModal.type && (
				<div className="modal-overlay">
					<div className="modal-box">
						<p>
							{confirmModal.type === "delete"
								? "⚠️ ยืนยันการลบคำศัพท์นี้?"
								: "💾 ยืนยันการบันทึกข้อมูล?"}
						</p>
						<div className="modal-actions">
							<button
								style={{
									background: confirmModal.type === "delete" ? "#ef4444" : "var(--primary-gradient)",
									color: "white",
									padding: "10px 24px",
									borderRadius: "8px",
									fontWeight: 600,
								}}
								onClick={
									confirmModal.type === "delete"
										? confirmDelete
										: confirmSave
								}
							>
								ยืนยัน
							</button>
							<button
								className="btn-cancel"
								onClick={() => setConfirmModal({ type: null })}
							>
								ยกเลิก
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>คำศัพท์</th>
							<th>ความหมาย</th>
							<th>ประเภท</th>
							<th>จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={4}>⏳ กำลังโหลด...</td>
							</tr>
						) : terms.length === 0 ? (
							<tr>
								<td colSpan={4}>ไม่พบข้อมูล</td>
							</tr>
						) : (
							terms.map((term) => (
								<tr key={term.word_id}>
									  <td>{escapeHtml(term.word)}</td>
									  <td>{escapeHtml(term.meaning)}</td>
									  <td>{escapeHtml(term.word_type)}</td>
									<td>
										<button
											title="ดูรายละเอียด"
											onClick={() => handleEdit(term)}
											style={{ color: "#8b5cf6" }}
										>
											👁
										</button>
										<button
											title="แก้ไข"
											onClick={() => handleEdit(term)}
											style={{ color: "#f59e0b" }}
										>
											✏️
										</button>
										<button
											title="ลบ"
											onClick={() => handleDelete(term.word_id)}
											style={{ color: "#ef4444" }}
										>
											🗑
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</main>
	);
}
