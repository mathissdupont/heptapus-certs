"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function AcikRizaPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const sections = isTr
    ? [
        ["1. Veri Sorumlusu", "Bu Açık Rıza Metni, HeptaCert platformu kapsamında işlenen kişisel verilerin yurt dışına aktarılmasına ilişkin kullanıcıların bilgilendirilmesi ve açık rızalarının alınması amacıyla hazırlanmıştır. Veri sorumlusu Heptapus Group’tur."],
        ["2. Açık Rızanın Konusu", "HeptaCert hizmetlerinin sunulması, platform altyapısının işletilmesi, kullanıcı hesabının oluşturulması ve yönetilmesi, etkinlik kayıt süreçlerinin yürütülmesi, sertifika oluşturulması, ödeme ve faturalandırma süreçlerinin desteklenmesi, sistem güvenliğinin sağlanması, yedekleme, bakım, teknik destek, hata kayıtlarının incelenmesi, siber güvenlik önlemlerinin uygulanması ve hizmet sürekliliğinin sağlanması amaçlarıyla kişisel verileriniz elektronik ortamda işlenebilir. HeptaCert, teknik altyapı ve sunucu barındırma hizmetleri kapsamında Hetzner Online GmbH tarafından sağlanan sunucu ve veri merkezi altyapısından yararlanmaktadır. HeptaCert ile Hetzner Online GmbH arasında veri işleme faaliyetlerine ilişkin Data Processing Agreement / Veri İşleme Sözleşmesi akdedilmiştir. Bu sözleşme, Hetzner Online GmbH’nin kişisel verileri altyapı ve barındırma hizmetlerinin sağlanması amacıyla, HeptaCert’in talimatları doğrultusunda ve uygun teknik/organizasyonel tedbirler kapsamında işlemesine ilişkin esasları düzenler. Kullanılan sunucular Finlandiya’nın Helsinki bölgesinde bulunmaktadır. Bu nedenle kişisel verileriniz, hizmetin sunulması için gerekli olduğu ölçüde Finlandiya’nın Helsinki bölgesinde bulunan sunucularda saklanabilir, işlenebilir, yedeklenebilir veya teknik olarak erişilebilir hale gelebilir."],
        ["3. Yurt Dışına Aktarılabilecek Kişisel Veriler", "Açık rızanız kapsamında yurt dışına aktarılabilecek kişisel veriler; kimlik bilgileriniz, iletişim bilgileriniz, kullanıcı hesabı bilgileriniz, etkinlik kayıt bilgileriniz, sertifika bilgileriniz, işlem güvenliği bilgileriniz, log kayıtlarınız, IP adresiniz, cihaz ve tarayıcı bilgileriniz, ödeme işlem referans bilgileriniz ve hizmetin niteliğine göre tarafınızca sisteme girilen diğer bilgilerden oluşabilir."],
        ["4. Aktarım Amacı", "Kişisel verilerinizin Finlandiya’nın Helsinki bölgesinde bulunan Hetzner Online GmbH altyapısında saklanması veya işlenmesi; HeptaCert hizmetlerinin sunulması, teknik altyapının işletilmesi, veri saklama, yedekleme, sistem güvenliği, hizmet sürekliliği, teknik destek, hata giderme, kötüye kullanımın önlenmesi ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla sınırlıdır."],
        ["5. Aktarım Yapılabilecek Alıcı", "Kişisel verileriniz, sunucu barındırma ve teknik altyapı hizmetleri kapsamında Finlandiya’nın Helsinki bölgesinde bulunan Hetzner Online GmbH altyapısında saklanabilir veya işlenebilir. HeptaCert ile Hetzner Online GmbH arasında veri işleme faaliyetlerine ilişkin Data Processing Agreement / Veri İşleme Sözleşmesi akdedilmiştir. Bu sözleşme, Hetzner Online GmbH’nin kişisel verileri altyapı ve barındırma hizmetlerinin sağlanması amacıyla, HeptaCert’in talimatları doğrultusunda ve uygun teknik/organizasyonel tedbirler kapsamında işlemesine ilişkin esasları düzenler. Hetzner Online GmbH, altyapı sağlayıcısı sıfatıyla kişisel verileri yalnızca barındırma ve teknik altyapı hizmetlerinin sağlanması amacıyla işleyebilir."],
        ["6. Açık Rıza Beyanı", "KVKK Aydınlatma Metni ve Gizlilik Politikası kapsamında bilgilendirildiğimi; kişisel verilerimin HeptaCert hizmetlerinin sunulması, teknik altyapının işletilmesi, veri saklama, yedekleme, güvenlik, teknik destek ve hizmet sürekliliğinin sağlanması amaçlarıyla, sunucuları Finlandiya’nın Helsinki bölgesinde bulunan Hetzner Online GmbH altyapısında saklanabileceğini, işlenebileceğini, yedeklenebileceğini veya teknik olarak erişilebilir hale getirilebileceğini anladığımı kabul ederim. HeptaCert ile Hetzner Online GmbH arasında veri işleme faaliyetlerine ilişkin Data Processing Agreement / Veri İşleme Sözleşmesi akdedilmiştir; ancak bu durum açık rıza beyanının yerine geçmez. Bu kapsamda kişisel verilerimin, yukarıda belirtilen amaçlarla sınırlı olarak yurt dışına aktarılmasına açık rıza veriyorum."],
        ["7. Rızanın Geri Alınması", "Açık rızanızı dilediğiniz zaman geri alabilirsiniz. Rızanın geri alınması, geri alma tarihinden önce rızaya dayanılarak gerçekleştirilen işlemlerin hukuka uygunluğunu etkilemez. Rızanın geri alınması halinde, HeptaCert hizmetlerinin teknik altyapısı yurt dışında bulunan sunucular üzerinden sağlandığından bazı hizmetlerin sunulması kısmen veya tamamen mümkün olmayabilir."],
        ["8. İlgili Metinler", "Kişisel verilerinizin işlenmesine ilişkin ayrıntılı bilgiye KVKK Aydınlatma Metni ve Gizlilik Politikası üzerinden ulaşabilirsiniz."],
      ]
    : [
        ["1. Data Controller", "This Explicit Consent Text has been prepared to inform users and obtain their explicit consent regarding the international transfer of personal data processed within the scope of the HeptaCert platform. The data controller is Heptapus Group."],
        ["2. Subject of Explicit Consent", "Your personal data may be processed electronically for the purposes of providing HeptaCert services, operating the platform infrastructure, creating and managing user accounts, carrying out event registration processes, generating certificates, supporting payment and invoicing processes, ensuring system security, performing backups, maintenance, technical support, reviewing error logs, implementing cybersecurity measures and ensuring service continuity. HeptaCert uses server and data center infrastructure provided by Hetzner Online GmbH for technical infrastructure and server hosting services. HeptaCert has entered into a Data Processing Agreement with Hetzner Online GmbH regarding data processing activities. Under this agreement, Hetzner Online GmbH acts as an infrastructure and hosting provider and processes personal data only for the purposes of providing hosting and technical infrastructure services, in accordance with HeptaCert’s instructions and applicable technical and organizational measures. The servers used are located in Helsinki, Finland. Therefore, your personal data may be stored, processed, backed up or technically made accessible on servers located in Helsinki, Finland to the extent necessary for the provision of the service."],
        ["3. Personal Data That May Be Transferred Abroad", "The personal data that may be transferred abroad based on your explicit consent may include your identity information, contact information, user account information, event registration information, certificate information, transaction security information, log records, IP address, device and browser information, payment transaction reference information and other information entered into the system by you depending on the nature of the service."],
        ["4. Purpose of Transfer", "The storage or processing of your personal data through the infrastructure of Hetzner Online GmbH located in Helsinki, Finland is limited to the purposes of providing HeptaCert services, operating the technical infrastructure, data storage, backup, system security, service continuity, technical support, troubleshooting, preventing abuse and fulfilling legal obligations."],
        ["5. Recipient of Transfer", "Your personal data may be stored or processed through the infrastructure of Hetzner Online GmbH located in Helsinki, Finland within the scope of server hosting and technical infrastructure services. HeptaCert has entered into a Data Processing Agreement with Hetzner Online GmbH regarding data processing activities. Under this agreement, Hetzner Online GmbH acts as an infrastructure and hosting provider and processes personal data only for the purposes of providing hosting and technical infrastructure services, in accordance with HeptaCert’s instructions and applicable technical and organizational measures. Hetzner Online GmbH may process personal data as an infrastructure provider only for the purposes of providing hosting and technical infrastructure services."],
        ["6. Explicit Consent Statement", "I acknowledge that I have been informed under the Privacy Notice and Privacy Policy, and that I understand my personal data may be stored, processed, backed up or technically made accessible through the infrastructure of Hetzner Online GmbH, whose servers are located in Helsinki, Finland, for the purposes of providing HeptaCert services, operating the technical infrastructure, data storage, backup, security, technical support and service continuity. HeptaCert has entered into a Data Processing Agreement with Hetzner Online GmbH regarding data processing activities; however, that agreement does not replace this explicit consent statement. In this context, I give my explicit consent to the international transfer of my personal data limited to the purposes stated above."],
        ["7. Withdrawal of Consent", "You may withdraw your explicit consent at any time. Withdrawal of consent does not affect the lawfulness of processing carried out based on consent before its withdrawal. Since HeptaCert services are provided through technical infrastructure located abroad, some services may become partially or completely unavailable if consent is withdrawn."],
        ["8. Related Texts", "You can access detailed information regarding the processing of your personal data through the Privacy Notice and Privacy Policy."],
      ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="transition-colors hover:text-brand-600">{isTr ? "Ana Sayfa" : "Home"}</Link>
        <span>/</span>
        <span className="font-medium text-gray-600">{isTr ? "Açık Rıza Metni" : "Explicit Consent Text"}</span>
      </div>

      <div className="space-y-8 rounded-2xl border border-gray-100 bg-white p-8 shadow-card md:p-12">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">{isTr ? "Hukuki Bilgilendirme" : "Legal Notice"}</p>
          <h1 className="text-3xl font-extrabold text-gray-900">{isTr ? "Açık Rıza Metni" : "Explicit Consent Text"}</h1>
          <p className="mt-2 text-sm text-gray-500">{isTr ? "Son güncelleme: 14 Mayıs 2026" : "Last updated: May 14, 2026"}</p>
        </div>

        {sections.map(([title, body]) => (
          <section key={title} className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            <p className="text-sm leading-relaxed text-gray-600">{body}</p>
          </section>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5">
          <div>
            <p className="text-xs text-gray-500">{isTr ? "Sorularınız için" : "For questions"}</p>
            <a href="mailto:contact@heptapusgroup.com" className="text-sm font-semibold text-brand-600 hover:underline">contact@heptapusgroup.com</a>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/kvkk" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "KVKK Aydınlatma Metni" : "Privacy Notice"}</Link>
            <Link href="/gizlilik" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "Gizlilik Politikası" : "Privacy Policy"}</Link>
            <Link href="/mesafeli-satis" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "Mesafeli Satış Sözleşmesi" : "Distance Sales Agreement"}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}