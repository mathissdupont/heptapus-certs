"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle, ChevronDown, ChevronUp, Send, X, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import type { SubscriptionInfo } from "@/lib/api";

interface SupportTicketMessage {
  role: "user" | "admin";
  message: string;
  timestamp: string;
}

interface SupportTicket {
  id: number;
  organization_id: number;
  user_id: number;
  subject: string;
  messages: SupportTicketMessage[];
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
}

export default function SupportTicketsPage() {
  const { lang } = useI18n();
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved" | "closed">("all");
  const [adminReply, setAdminReply] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [filter]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const query = filter === "all" ? "" : `?status=${filter}`;
      const response = await apiFetch(`/superadmin/support-tickets${query}`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error("Failed to load support tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    try {
      const response = await apiFetch(`/superadmin/support-tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const updated = await response.json();
        setTickets(tickets.map(t => t.id === ticketId ? updated : t));
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(updated);
        }
      }
    } catch (error) {
      console.error("Failed to update ticket status:", error);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !adminReply.trim()) return;

    setReplying(true);
    try {
      const response = await apiFetch(`/superadmin/support-tickets/${selectedTicket.id}`, {
        method: "PATCH",
        body: JSON.stringify({ admin_reply: adminReply })
      });

      if (response.ok) {
        const updated = await response.json();
        setSelectedTicket(updated);
        setTickets(tickets.map(t => t.id === selectedTicket.id ? updated : t));
        setAdminReply("");
      }
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setReplying(false);
    }
  };

  const copy = {
    tr: {
      title: "Destek Talepleri",
      description: "AI asistan tarafından çözülemeyen kullanıcı destek talepleri",
      filter: "Filtrele",
      all: "Tümü",
      open: "Açık",
      in_progress: "İşlemde",
      resolved: "Çözümlendi",
      closed: "Kapatıldı",
      no_tickets: "Destek talebi yok",
      subject: "Konu",
      user: "Kullanıcı",
      organization: "Organizasyon",
      created: "Oluşturulma",
      status: "Durum",
      messages: "Mesajlar",
      reply: "Yanıt Gönder",
      type_reply: "Yanıtınızı yazın...",
      send: "Gönder",
      change_status: "Durumu Değiştir",
      close_detail: "Detayları Kapat"
    },
    en: {
      title: "Support Tickets",
      description: "User support requests that couldn't be solved by AI assistant",
      filter: "Filter",
      all: "All",
      open: "Open",
      in_progress: "In Progress",
      resolved: "Resolved",
      closed: "Closed",
      no_tickets: "No support tickets",
      subject: "Subject",
      user: "User",
      organization: "Organization",
      created: "Created",
      status: "Status",
      messages: "Messages",
      reply: "Send Reply",
      type_reply: "Type your reply...",
      send: "Send",
      change_status: "Change Status",
      close_detail: "Close Details"
    }
  };

  const text = copy[lang as keyof typeof copy];
  const statusColors = {
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-surface-100 text-surface-700"
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={text.title}
        subtitle={text.description}
        icon={<MessageCircle className="h-6 w-6" />}
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-surface-200">
        {(["all", "open", "in_progress", "resolved", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-3 border-b-2 font-medium text-sm transition ${
              filter === f
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-surface-600 hover:text-surface-900"
            }`}
          >
            {text[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-surface-500">Yükleniyor...</div>
      ) : tickets.length === 0 ? (
        <div className="card p-8 text-center text-surface-500">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>{text.no_tickets}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1 space-y-2">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  selectedTicket?.id === ticket.id
                    ? "border-brand-600 bg-brand-50"
                    : "border-surface-200 hover:border-surface-300 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-surface-900 line-clamp-1 flex-1">
                    {ticket.subject}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[ticket.status]}`}>
                    {text[ticket.status]}
                  </span>
                </div>
                <p className="text-xs text-surface-500">
                  {new Date(ticket.created_at).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}
                </p>
              </button>
            ))}
          </div>

          {/* Ticket Detail */}
          {selectedTicket && (
            <div className="lg:col-span-2 card p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-200">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-surface-900 mb-2">
                    {selectedTicket.subject}
                  </h2>
                  <div className="space-y-1 text-sm text-surface-600">
                    <p>{text.user}: {selectedTicket.user_id}</p>
                    <p>{text.organization}: {selectedTicket.organization_id}</p>
                    <p>{text.created}: {new Date(selectedTicket.created_at).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}</p>
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="flex flex-col gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                    className="px-3 py-2 border border-surface-300 rounded-lg text-sm font-medium bg-white"
                  >
                    <option value="open">{text.open}</option>
                    <option value="in_progress">{text.in_progress}</option>
                    <option value="resolved">{text.resolved}</option>
                    <option value="closed">{text.closed}</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {selectedTicket.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-surface-100 text-surface-900 rounded-bl-none"
                          : "bg-brand-600 text-white rounded-br-none"
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.role === "user" ? "text-surface-600" : "text-brand-100"}`}>
                        {new Date(msg.timestamp).toLocaleTimeString(lang === "tr" ? "tr-TR" : "en-US", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Input */}
              {selectedTicket.status !== "closed" && (
                <div className="space-y-2 pt-4 border-t border-surface-200">
                  <textarea
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    placeholder={text.type_reply}
                    rows={3}
                    className="w-full px-4 py-3 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    disabled={replying}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!adminReply.trim() || replying}
                    className="w-full px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {replying ? (lang === "tr" ? "Gönderiliyor..." : "Sending...") : text.send}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
