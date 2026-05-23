import { compactText, fuzzyAny } from "./text";

type FaqItem = { keywords: string[]; answer: string };

const FAQ_DATABASE: Record<string, FaqItem[]> = {
  tr: [
    { keywords: ["form", "alan", "registration", "field", "kayıt"], answer: "Form alanlarını eklemek için Etkinlik Ayarları > Kayıt Formu bölümüne gidin. '+Alan Ekle' butonunu tıklayarak yeni alanlar oluşturabilirsiniz." },
    { keywords: ["sertifika", "certificate", "şablon"], answer: "Sertifika şablonlarını Editor sayfasında özelleştirebilirsiniz." },
    { keywords: ["kvkk", "gizlilik", "aydınlatma"], answer: "KVKK için Etkinlik Ayarları > Kayıt Formu bölümünde aydınlatma metni ve açık rıza kutusu ekleyin." },
  ],
  en: [
    { keywords: ["form", "field", "registration"], answer: "To add form fields, go to Event Settings > Registration Form and click '+Add Field'." },
    { keywords: ["certificate", "template"], answer: "Customize certificate templates on the Editor page." },
    { keywords: ["privacy", "kvkk"], answer: "Add privacy notice in Registration Form settings; include purpose, retention and controller info." },
  ],
};

function scoreFaqAnswer(question: string, faqItem: FaqItem): number {
  const q = compactText(question);
  let score = 0;
  for (const kw of faqItem.keywords) {
    if (q.includes(kw)) score += 3;
    else if (fuzzyAny(q, [kw])) score += 1;
  }
  return score;
}

export function findFaqAnswer(question: string, lang = "tr"): string | null {
  const db = FAQ_DATABASE[lang] || FAQ_DATABASE["en"];
  let best: { item: FaqItem; score: number } | null = null;
  for (const it of db) {
    const s = scoreFaqAnswer(question, it);
    if (!best || s > best.score) best = { item: it, score: s };
  }
  if (best && best.score >= 3) return best.item.answer;
  return null;
}

export default { findFaqAnswer, scoreFaqAnswer };
