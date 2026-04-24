"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function TermsPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const sections = isTr
    ? [
        ["1. Taraflar ve Tanımlar", "Bu Kullanım Koşulları; HeptaCert platformunu kullanan hesap sahibi (\"Kullanıcı\") ile Heptapus Group (\"Şirket\") arasında akdedilir. Şirket, platformu teknik altyapı ve dijital servis sağlayıcı olarak sunar."],
        ["2. Hizmetin Niteliği", "HeptaCert; etkinlik yönetimi, katılımcı kayıtları, doğrulama, sertifika üretimi, raporlama ve ilişkili iletişim altyapısı sunar. Platform, kullanıcıların kendi süreçlerini yönetebileceği bir yazılım hizmetidir."],
        ["3. Servis Sağlayıcı Sıfatı", "Şirket, platform altyapısını sağlar; kullanıcıların sisteme yüklediği veri, belge, metin, medya, etkinlik içeriği ve kullanım amacının sahibi değildir. Bu içeriklerin hukuka uygunluğu ve doğruluğu tamamen ilgili kullanıcıya/kuruma aittir."],
        ["4. Kullanım Amacı ve İçerik Sorumluluğu", "Kullanıcı, platformu yalnızca hukuka uygun amaçlarla kullanacağını kabul eder. Platformun ne amaçla kullanıldığı, hangi etkinliklerde ve hangi kapsamda veri işlendiği konusunda asli sorumluluk kullanıcıdadır; Şirket bu amaçların belirleyicisi değildir."],
        ["5. Etkinlik Düzenleyicisinin Sorumluluğu", "Etkinlik oluşturan/düzenleyen kullanıcı, etkinliğe ilişkin tüm operasyonel ve hukuki yükümlülüklerden sorumludur. Etkinlik kayıt formları, katılımcıdan alınan ek veriler, aydınlatma metinleri ve gerekli açık rızaların alınması düzenleyicinin sorumluluğundadır."],
        ["6. KVKK ve Kişisel Veri Rolleri", "Platformun hesap ve güvenlik süreçlerinde Şirket, işleme faaliyetinin niteliğine göre veri sorumlusu veya veri işleyen olarak hareket edebilir. Etkinliğe özel verilerde etkinlik düzenleyicisi ayrıca bağımsız veri sorumlusu olabilir. Taraflar kendi rolüne düşen KVKK yükümlülüklerini ayrı ayrı yerine getirir."],
        ["7. Hesap Güvenliği", "Kullanıcı, hesap erişim bilgilerini gizli tutmakla yükümlüdür. Hesap üzerinden yapılan işlemler kullanıcı hesabına ait kabul edilir. Şifre güvenliği, yetki paylaşımı ve kurum içi erişim yönetimi kullanıcı sorumluluğundadır."],
        ["8. Yasaklı Kullanımlar", "Hukuka aykırı içerik yüklemek, üçüncü kişi haklarını ihlal etmek, yanıltıcı işlem yapmak, yetkisiz veri toplamak, spam/faaliyet kötüye kullanımı ve sistem güvenliğini zayıflatacak davranışlar yasaktır."],
        ["9. İçerik ve Hak İhlali Bildirimleri", "Kullanıcı; yüklediği içerik üzerinde gerekli haklara sahip olduğunu taahhüt eder. Telif, marka, kişilik hakkı veya veri ihlali iddialarından doğan talepler öncelikle ilgili içeriği yükleyen kullanıcıya yöneltilir."],
        ["10. Ücretlendirme, Faturalama ve İade", "Ücretli planlar, kredi kullanımı, faturalama ve iade süreçleri ilgili politika metinlerine tabidir. Yasal vergi ve mali yükümlülükler yürürlükteki mevzuata göre uygulanır."],
        ["11. Hizmet Seviyesi ve Teknik Sınırlar", "Şirket hizmeti makul teknik özenle sunar; ancak internet altyapısı, üçüncü taraf servisler, bakım çalışmaları, mücbir sebep ve kullanıcı kaynaklı nedenlerle kesinti/performans değişiklikleri yaşanabilir."],
        ["12. Sorumluluğun Sınırlandırılması", "Şirket; mevzuatın izin verdiği ölçüde dolaylı zarar, kar kaybı ve itibar kaybından sorumlu tutulamaz. Ancak kast, ağır kusur ve emredici tüketici mevzuatından doğan sorumluluk halleri saklıdır. Kullanıcı kaynaklı içerik ve kullanım amaçlarına ilişkin birincil sorumluluk kullanıcıya aittir."],
        ["13. Tazmin", "Kullanıcı; bu koşullara, mevzuata veya üçüncü kişi haklarına aykırı kullanımı nedeniyle Şirketin maruz kalabileceği makul zarar, masraf ve talepleri tazmin etmeyi kabul eder."],
        ["14. Askıya Alma ve Fesih", "Şirket; güvenlik riski, hukuka aykırılık, kötüye kullanım veya bu koşulların ihlali hallerinde hesabı geçici ya da kalıcı olarak askıya alabilir veya sonlandırabilir."],
        ["15. Değişiklikler, Sürümleme ve Bildirim", "Şirket koşulları güncelleyebilir. Güncellemelerde sözleşme sürümü, yayın tarihi ve yürürlük tarihi belirtilir. Esaslı değişiklikler makul bir süre önce platform içinde duyurulur; güvenlik veya mevzuat kaynaklı acil güncellemeler derhal yürürlüğe alınabilir."],
        ["16. Uygulanacak Hukuk ve Uyuşmazlık", "İşbu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Tüketici sıfatını haiz kullanıcılar bakımından emredici yetki ve başvuru kuralları saklıdır. Tüketici olmayan uyuşmazlıklarda İstanbul (Merkez) Mahkemeleri ve İcra Daireleri yetkilidir."],
        ["17. İşleten Bilgisi", "Platform işletenine ilişkin güncel iletişim ve bildirim bilgileri İletişim sayfasında yayımlanır. İşletenin ticari statüsüne göre zorunlu olmayan sicil alanları ayrıca beyan edilmeyebilir."],
      ]
    : [
        ["1. Parties and Definitions", "These Terms of Use are entered into between the account holder using HeptaCert (\"User\") and Heptapus Group (\"Company\"). The Company provides the platform as a technical infrastructure and digital service provider."],
        ["2. Nature of Service", "HeptaCert provides event management, attendee registration, verification, certificate generation, reporting, and related communication infrastructure. The platform is software-as-a-service for users to run their own workflows."],
        ["3. Service Provider Capacity", "The Company provides infrastructure only. The Company is not the owner of user-uploaded data, documents, text, media, event content, or user-defined processing purposes. Responsibility for legality and accuracy of such content belongs to the relevant user/entity."],
        ["4. Purpose of Use and Content Responsibility", "The User agrees to use the platform only for lawful purposes. The purpose for which the platform is used and the scope of processing are determined by the User; such determination is not under the Company's control."],
        ["5. Event Organizer Responsibility", "Users creating/managing events are solely responsible for event operations and legal compliance. Event registration forms, additional attendee data collection, notices, and required consents are the organizer's responsibility."],
        ["6. Data Protection Roles", "For account and security operations, the Company may act as a data controller or data processor depending on the processing context. For event-specific personal data, the event organizer may also act as an independent data controller. Each party must fulfill obligations corresponding to its role."],
        ["7. Account Security", "Users must keep credentials confidential. Actions performed through an account are deemed to be performed by that account holder. Password security, role assignment, and internal access management are the User's responsibility."],
        ["8. Prohibited Uses", "Uploading unlawful content, infringing third-party rights, deceptive conduct, unauthorized data collection, spam/abuse, and behavior compromising platform security are prohibited."],
        ["9. Content and Rights Claims", "The User warrants they have necessary rights for uploaded content. Claims related to copyright, trademark, personality rights, or data violations are primarily directed to the user/entity that uploaded the content."],
        ["10. Pricing, Billing, and Refunds", "Paid plans, credits, billing, and refunds are governed by applicable policy documents. Taxes and legal financial obligations are applied under applicable law."],
        ["11. Service Availability and Technical Limits", "The Company provides service with reasonable care; however interruptions or performance changes may occur due to internet infrastructure, third-party services, maintenance, force majeure, or user-side causes."],
        ["12. Limitation of Liability", "To the extent permitted by law, the Company is not liable for indirect damages, loss of profit, or reputational loss. This does not exclude liability arising from willful misconduct, gross negligence, or mandatory consumer law. Primary responsibility for user-generated content and intended use remains with the User."],
        ["13. Indemnification", "The User agrees to indemnify the Company for reasonable losses, costs, and claims arising from the User's breach of these terms, legal violations, or third-party rights infringements."],
        ["14. Suspension and Termination", "The Company may temporarily or permanently suspend/terminate accounts in cases of security risk, unlawful use, abuse, or breach of these terms."],
        ["15. Updates, Versioning, and Notice", "The Company may update these terms. Updated versions include a version identifier, publication date, and effective date. Material changes are announced on-platform within a reasonable notice period; urgent legal/security updates may take effect immediately."],
        ["16. Governing Law and Disputes", "These terms are governed by the laws of the Republic of Turkiye. Mandatory jurisdiction and remedy rights for consumers remain reserved. For non-consumer disputes, Istanbul (Central) Courts and Enforcement Offices have jurisdiction."],
        ["17. Operator Information", "Current contact and legal notice details of the platform operator are published on the Contact page. Registry fields that are not legally mandatory for the operator's status may be omitted."],
      ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="transition-colors hover:text-brand-600">{isTr ? "Ana Sayfa" : "Home"}</Link>
        <span>/</span>
        <span className="font-medium text-gray-600">{isTr ? "Kullanım Koşulları" : "Terms of Use"}</span>
      </div>

      <div className="space-y-8 rounded-2xl border border-gray-100 bg-white p-8 shadow-card md:p-12">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">{isTr ? "Hukuki Bilgilendirme" : "Legal Notice"}</p>
          <h1 className="text-3xl font-extrabold text-gray-900">{isTr ? "Kullanım Koşulları" : "Terms of Use"}</h1>
          <p className="mt-2 text-sm text-gray-500">{isTr ? "Son güncelleme: 23 Nisan 2026" : "Last updated: April 23, 2026"}</p>
        </div>

        {sections.map(([title, body]) => (
          <section key={title} className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            <p className="text-sm leading-relaxed text-gray-600">{body}</p>
          </section>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5">
          <div>
            <p className="text-xs text-gray-500">{isTr ? "Hukuki talepler için" : "For legal requests"}</p>
            <a href="mailto:legal@heptapusgroup.com" className="text-sm font-semibold text-brand-600 hover:underline">legal@heptapusgroup.com</a>
          </div>
          <div className="flex gap-3">
            <Link href="/gizlilik" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "Gizlilik Politikası" : "Privacy Policy"}</Link>
            <Link href="/kvkk" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "KVKK" : "Privacy Notice"}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
