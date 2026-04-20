"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, AlertCircle, Lightbulb } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Message {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

// FAQ Bilgi Tabanı
const FAQ_DATABASE = {
  tr: [
    {
      keywords: ["form", "alan", "registration", "field", "kayıt"],
      answer: "Form alanlarını eklemek için Etkinlik Ayarları > Kayıt Formu bölümüne gidin. '+Alan Ekle' butonunu tıklayarak yeni alanlar oluşturabilirsiniz. Her alan için türünü (metin, e-posta, tarih vb.), etiketini ve yardımcı metni belirleyebilirsiniz. Alan tipleri: Kısa Metin, E-posta, Telefon, Sayı, Tarih, Çoktan Seçmeli, Dosya Yükleme gibi seçenekler bulunmaktadır."
    },
    {
      keywords: ["sertifika", "certificate", "template", "şablon"],
      answer: "Sertifika şablonlarını Editor sayfasında özelleştirebilirsiniz. Şablonlara arka plan, logoları, metinleri ve tarzları ekleyebilirsiniz. Önizleme alanında değişiklikleri hemen görebilirsiniz. Sertifika yayınlanmadan önce test katılımcılarla kontrol edebilirsiniz."
    },
    {
      keywords: ["attendee", "katılımcı", "participant", "member", "üye"],
      answer: "Katılımcılar bölümünde etkinliğinize kayıtlı tüm üyeleri görebilirsiniz. Katılımcı durumunu (kayıtlı, geldimi, gelmedi) değiştirebilir, sertifika verişini yönetebilir veya toplu işlemler yapabilirsiniz. Ayrıca katılımcı bilgilerini dışa aktarabilirsiniz."
    },
    {
      keywords: ["email", "posta", "notification", "bildirim", "smtp"],
      answer: "E-posta ayarlarını Etkinlik Ayarları > E-posta bölümünde yapılandırabılırsinız. Otomatik sertifika e-postalarını özelleştirebilir, SMTP ayarlarını belirleyebilirsiniz. E-posta şablonlarını kişiselleştirebilir ve zamanlama seçeneklerini ayarlayabilirsiniz."
    },
    {
      keywords: ["raffle", "çekiliş", "draw", "prize", "ödül"],
      answer: "Çekiliş oluşturmak için Çekiliş sayfasına gidin. Ödüller ekleyin, katılımcı kurallarını belirleyin (kayıt yapanlar, sertifika alanlar, vb.) ve otomatik olarak kazananları seçtirebilirsiniz. Çekiliş tarihi ve saatini önceden planlayabilirsiniz."
    },
    {
      keywords: ["survey", "anket", "question", "soru"],
      answer: "Anketleri Etkinlik Ayarları > Anket bölümünde oluşturabilirsiniz. Soruları ekleyin, türlerini seçin (metin, çoktan seçme, çoklu seçim, vb.) ve katılımcılar tarafından cevaplanmasını sağlayabilirsiniz. Anket sonuçlarını detaylı olarak analiz edebilirsiniz."
    },
    {
      keywords: ["session", "oturum", "schedule", "timetable", "program"],
      answer: "Oturumları Oturumlar sayfasından ekleyebilirsiniz. Her oturumun tarihini, saatini, başlığını ve konuşmacısını belirleyebilirsiniz. Check-in sistemi otomatik olarak oturumlara göre çalışır. Katılımcılar etkinlik sayfasından oturumlara kaydolabilir."
    },
    {
      keywords: ["analytics", "istatistik", "report", "data", "grafik"],
      answer: "Analytics bölümünde etkinliğinizin kapsamlı istatistiklerini görebilirsiniz. Kayıt sayıları, katılımcı dağılımı, sertifika durumu, cinsiyete göre dağılım ve daha fazlasını analiz edebilirsiniz. Raporları Excel olarak dışa aktarabilirsiniz."
    },
    {
      keywords: ["domain", "custom", "özel", "alan adı", "url"],
      answer: "Etkinliğinize özel bir domain atamak için Etkinlik Ayarları > Domain bölümüne gidin. Kendi alan adınızı bağlayabilir veya HeptaCert tarafından sağlanan alt domain'i kullanabilirsiniz. Domain değişikliği DNS ayarlarından sonra yayına alınabilir."
    },
    {
      keywords: ["checkin", "check-in", "giriş", "kontrol"],
      answer: "Check-in sistemi etkinlik günü katılımcı kaydını hızlandırır. QR kod veya kontrol listesi kullanarak katılımcıları işaretleyebilirsiniz. Check-in panelinden katılımcı durumunu gerçek zamanlı takip edebilirsiniz."
    },
    {
      keywords: ["gamification", "badge", "rozet", "puan", "leaderboard"],
      answer: "Gamifikasyon özelliğini etkinleştirerek katılımcıları rozetler, puanlar ve liderlik tablosuyla motive edebilirsiniz. Farklı aktivitelere (oturum katılımı, anket cevaplama, vb.) puan atayabilirsiniz."
    },
    {
      keywords: ["branding", "tema", "renk", "logo", "görünüm"],
      answer: "Etkinlik Ayarları > Branding bölümünde kurumsal kimliğinizi ayarlayabilirsiniz. Logo, tema renkleri ve yazı tiplerini özelleştirebilirsiniz. Mobil ve masaüstü uyumluluğunu otomatik olarak sağlanır."
    },
    {
      keywords: ["payment", "ödeme", "ticket", "bilet", "fiyat"],
      answer: "Etkinliğiniz için ödeme sistemi kurmak için Etkinlik Ayarları > Ödeme bölümüne gidin. Bilet fiyatlandırması, erken kuş indirimi ve grup indirimlerini ayarlayabilirsiniz. Stripe ve diğer ödeme yöntemiyle entegredir."
    }
  ],
  en: [
    {
      keywords: ["form", "field", "registration", "input"],
      answer: "To add form fields, go to Event Settings > Registration Form. Click '+Add Field' to create new fields. You can set the field type (text, email, date, etc.), label, and helper text for each field. Available field types include Short Text, Email, Phone, Number, Date, Multiple Choice, File Upload and more."
    },
    {
      keywords: ["certificate", "template", "cert"],
      answer: "Customize certificate templates in the Editor page. You can add backgrounds, logos, text, and styling. See changes in real-time in the preview area. Test certificates with sample attendees before publishing."
    },
    {
      keywords: ["attendee", "participant", "member", "user"],
      answer: "In the Attendees section, you can view all registered members for your event. You can change attendee status (registered, attended, no-show), manage certificate issuance, or perform bulk operations. Export attendee data to Excel format."
    },
    {
      keywords: ["email", "mail", "notification", "smtp"],
      answer: "Configure email settings in Event Settings > Email. Customize automatic certificate emails and set up your SMTP configuration. Personalize email templates and adjust scheduling options."
    },
    {
      keywords: ["raffle", "draw", "prize", "winner"],
      answer: "Create raffles in the Raffles page. Add prizes, set participant rules (registered attendees, certificate holders, etc.), and automatically select winners. Schedule raffle draws in advance."
    },
    {
      keywords: ["survey", "questionnaire", "question", "poll"],
      answer: "Create surveys in Event Settings > Survey. Add questions, choose types (text, multiple choice, checkbox, etc.), and enable participants to answer them. Analyze survey results in detail."
    },
    {
      keywords: ["session", "schedule", "timetable", "timing"],
      answer: "Add sessions from the Sessions page. Set the date, time, title, and speaker for each session. The check-in system works automatically based on sessions. Participants can register for sessions from the event page."
    },
    {
      keywords: ["analytics", "statistics", "report", "data", "metrics"],
      answer: "View comprehensive statistics of your event in the Analytics section. Analyze registration numbers, participant distribution, certificate status, gender demographics, and more. Export reports to Excel format."
    },
    {
      keywords: ["domain", "custom", "url"],
      answer: "To assign a custom domain to your event, go to Event Settings > Domain. You can connect your own domain or use the HeptaCert subdomain provided. Domain changes are activated after DNS settings."
    },
    {
      keywords: ["checkin", "check-in", "attendance"],
      answer: "The check-in system speeds up participant registration on event day. You can check in participants using QR codes or a checklist. Track participant status in real-time from the check-in panel."
    },
    {
      keywords: ["gamification", "badge", "points", "leaderboard"],
      answer: "Enable gamification to motivate participants with badges, points, and leaderboards. Assign points to different activities (session attendance, survey completion, etc.)."
    },
    {
      keywords: ["branding", "theme", "color", "logo"],
      answer: "Customize your brand identity in Event Settings > Branding. Personalize logo, theme colors, and typography. Mobile and desktop compatibility is automatically ensured."
    },
    {
      keywords: ["payment", "ticket", "pricing"],
      answer: "To set up a payment system for your event, go to Event Settings > Payment. Configure ticket pricing, early bird discounts, and group discounts. Integrated with Stripe and other payment methods."
    }
  ]
};

export default function AIAssistant() {
  const { lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      message: lang === "tr" ? "Merhaba! Size etkinlik oluşturma ve yönetiminde yardımcı olmak için buradayım. Ne sorunuz var?" : "Hello! I'm here to help you with event creation and management. What questions do you have?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState("");
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findAnswer = (userMessage: string): string | null => {
    const faqDb = FAQ_DATABASE[lang as keyof typeof FAQ_DATABASE];
    const lowerMsg = userMessage.toLowerCase();

    for (const faq of faqDb) {
      if (faq.keywords.some(keyword => lowerMsg.includes(keyword))) {
        return faq.answer;
      }
    }
    return null;
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // Add user message
    const userMsg: Message = {
      role: "user",
      message: input,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Find answer
    const answer = findAnswer(input);
    
    // Add assistant response
    const assistantMsg: Message = {
      role: "assistant",
      message: answer || (lang === "tr" ? "Maalesef bu soruya yanıt bulamadım. Lütfen 'Destek Talebi Aç' butonunu kullanarak detaylı açıklamayı yapınız." : "Sorry, I couldn't find an answer to this question. Please use 'Create Support Ticket' button for more details."),
      timestamp: new Date().toISOString()
    };
    
    setTimeout(() => {
      setMessages(prev => [...prev, assistantMsg]);
    }, 300);
  };

  const handleCreateSupport = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) return;

    setLoading(true);
    try {
      // Try multiple token storage locations
      let token = localStorage.getItem("token");
      if (!token) token = sessionStorage.getItem("token");
      if (!token) token = localStorage.getItem("auth_token");
      
      if (!token) {
        const assistantMsg: Message = {
          role: "assistant",
          message: lang === "tr" ? "❌ Oturum hatası. Lütfen sayfayı yenileyin ve tekrar deneyin." : "❌ Session error. Please refresh and try again.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/support-tickets", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: supportSubject,
          message: supportMessage
        })
      });

      if (response.ok) {
        // Success
        const assistantMsg: Message = {
          role: "assistant",
          message: lang === "tr" ? "✅ Destek talebiniz başarıyla oluşturuldu! Destek Ekibimiz en kısa sürede size ulaşacak. Email adresinizdeki güncellemeleri takip edin." : "✅ Your support ticket created! Our team will reach out soon. Check your email for updates.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
        setSupportSubject("");
        setSupportMessage("");
        setShowSupportForm(false);
      } else {
        const error = await response.json();
        const assistantMsg: Message = {
          role: "assistant",
          message: lang === "tr" ? `❌ Hata: ${error.detail || "Destek talebini oluşturmada hata oluştu"}` : `❌ Error: ${error.detail || "Failed to create support ticket"}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error) {
      const assistantMsg: Message = {
        role: "assistant",
        message: lang === "tr" ? "❌ Bağlantı hatası. Lütfen daha sonra tekrar deneyin." : "❌ Connection error. Please try again later.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 flex items-center justify-center h-14 w-14 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition z-40"
          title={lang === "tr" ? "AI Asistan" : "AI Assistant"}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-surface-200">
          {/* Header */}
          <div className="bg-brand-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              <h3 className="font-semibold">
                {lang === "tr" ? "HeptaCert AI Asistan" : "HeptaCert AI Assistant"}
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-brand-700 p-1 rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2.5 rounded-lg text-sm ${
                    msg.role === "user"
                      ? "bg-brand-600 text-white rounded-br-none"
                      : "bg-white text-surface-900 border border-surface-200 rounded-bl-none"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Support Form */}
          {showSupportForm && (
            <div className="border-t border-surface-200 p-4 space-y-3 bg-amber-50">
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-sm text-amber-900">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-600" />
                <p className="font-medium">
                  {lang === "tr"
                    ? "Sorununuzu detaylı açıklayın. Destek Ekibimiz kısa sürede yanıtlayacak."
                    : "Describe your issue in detail. Our support team will respond shortly."}
                </p>
              </div>
              
              <input
                type="text"
                placeholder={lang === "tr" ? "Konu..." : "Subject..."}
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value)}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                disabled={loading}
              />
              
              <textarea
                placeholder={lang === "tr" ? "Mesajınız..." : "Your message..."}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                disabled={loading}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSupportForm(false)}
                  className="flex-1 px-3 py-2.5 border border-surface-300 rounded-lg text-sm font-semibold text-surface-700 bg-white hover:bg-surface-50 transition disabled:opacity-50"
                  disabled={loading}
                >
                  {lang === "tr" ? "İptal" : "Cancel"}
                </button>
                <button
                  onClick={handleCreateSupport}
                  className="flex-1 px-3 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-lg text-sm font-semibold hover:from-brand-700 hover:to-brand-800 transition disabled:opacity-50 shadow-md"
                  disabled={loading || !supportSubject.trim() || !supportMessage.trim()}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                      {lang === "tr" ? "Gönderiliyor..." : "Sending..."}
                    </span>
                  ) : (lang === "tr" ? "Talep Oluştur" : "Create Ticket")}
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-surface-200 p-4 space-y-2">
            {!showSupportForm ? (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={lang === "tr" ? "Sorunuzu sorun..." : "Ask your question..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim()}
                    className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => setShowSupportForm(true)}
                  className="w-full px-4 py-2.5 border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 rounded-lg text-sm font-semibold hover:from-amber-100 hover:to-orange-100 transition shadow-sm"
                >
                  <span className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {lang === "tr" ? "Destek Talebi Oluştur" : "Create Support Ticket"}
                  </span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
