"""Default system email templates used by CRM, automation, and event emails."""

SYSTEM_EMAIL_TEMPLATE_PRESETS = [
    {
        "name": "Sertifika Teslimi",
        "subject_tr": "Sertifikanız hazır | {{event_name}}",
        "subject_en": "Your certificate is ready | {{event_name}}",
        "body_html": """
<h2>Merhaba {{recipient_name}},</h2>
<p>{{event_name}} etkinliğine katılımınız için teşekkürler. Sertifikanız hazır.</p>
<p><a href="{{certificate_link}}">Sertifikanızı görüntüleyin</a></p>
<p>Sertifikanızı LinkedIn profilinize ekleyebilir veya doğrulama bağlantısını paylaşabilirsiniz.</p>
<p>Saygılarımızla,<br>HeptaCert Ekibi</p>
""",
    },
    {
        "name": "Kayıt Onayı",
        "subject_tr": "Kaydınız alındı | {{event_name}}",
        "subject_en": "Registration confirmed | {{event_name}}",
        "body_html": """
<h2>Merhaba {{recipient_name}},</h2>
<p>{{event_name}} etkinliği için kaydınız başarıyla alındı.</p>
<ul>
  <li><strong>Tarih:</strong> {{event_date}}</li>
  <li><strong>Yer:</strong> {{event_location}}</li>
</ul>
<p>Etkinlik sayfası: <a href="{{event_link}}">{{event_link}}</a></p>
<p>Görüşmek üzere,<br>HeptaCert Ekibi</p>
""",
    },
    {
        "name": "Katılım Teşekkürü",
        "subject_tr": "Katıldığınız için teşekkürler | {{event_name}}",
        "subject_en": "Thanks for attending | {{event_name}}",
        "body_html": """
<h2>Merhaba {{recipient_name}},</h2>
<p>{{event_name}} etkinliğine katıldığınız için teşekkür ederiz.</p>
<p>Sunumlar, sertifikalar veya topluluk güncellemeleri hazır olduğunda sizi bilgilendireceğiz.</p>
<p>Deneyiminizi paylaşmak isterseniz bu e-postayı yanıtlayabilirsiniz.</p>
""",
    },
    {
        "name": "No-show Takibi",
        "subject_tr": "{{event_name}} etkinliğini kaçırdınız mı?",
        "subject_en": "Did you miss {{event_name}}?",
        "body_html": """
<h2>Merhaba {{recipient_name}},</h2>
<p>{{event_name}} için kaydınız vardı fakat katılım kaydı göremedik.</p>
<p>Etkinlik özetini ve gelecek programları buradan takip edebilirsiniz: <a href="{{event_link}}">{{event_link}}</a></p>
<p>Bir sonraki etkinlikte görüşmek dileğiyle.</p>
""",
    },
    {
        "name": "Anket Hatırlatma",
        "subject_tr": "Kısa anketinizi tamamlar mısınız? | {{event_name}}",
        "subject_en": "Please complete your short survey | {{event_name}}",
        "body_html": """
<h2>Merhaba {{recipient_name}},</h2>
<p>{{event_name}} deneyiminizi iyileştirmek için kısa geri bildiriminize ihtiyacımız var.</p>
<p>Anket bağlantısı: <a href="{{survey_link}}">{{survey_link}}</a></p>
<p>Katkınız için teşekkürler.</p>
""",
    },
    {
        "name": "LinkedIn Paylaşım Daveti",
        "subject_tr": "Başarınızı LinkedIn'de paylaşın | {{event_name}}",
        "subject_en": "Share your achievement on LinkedIn | {{event_name}}",
        "body_html": """
<h2>Merhaba {{recipient_name}},</h2>
<p>{{event_name}} sertifikanız hazır. İsterseniz başarınızı LinkedIn'de paylaşabilirsiniz.</p>
<p><a href="{{linkedin_share_link}}">LinkedIn paylaşımı oluştur</a></p>
<p>Sertifika doğrulama bağlantısı: <a href="{{certificate_link}}">{{certificate_link}}</a></p>
""",
    },
    {
        "name": "Rozet Kazanımı",
        "subject_tr": "Yeni rozet kazandınız | {{event_name}}",
        "subject_en": "You earned a new badge | {{event_name}}",
        "body_html": """
<h2>Tebrikler {{recipient_name}},</h2>
<p>{{event_name}} kapsamında yeni bir rozet kazandınız.</p>
<p>Profilinizde rozetlerinizi ve sertifikalarınızı görüntüleyebilirsiniz: <a href="{{wallet_link}}">{{wallet_link}}</a></p>
""",
    },
    {
        "name": "Sertifika Yenileme Hatırlatma",
        "subject_tr": "Sertifikanızın süresi yaklaşıyor | {{event_name}}",
        "subject_en": "Your certificate is expiring soon | {{event_name}}",
        "body_html": """
<h2>Merhaba {{recipient_name}},</h2>
<p>{{event_name}} sertifikanızın geçerlilik süresi yaklaşıyor.</p>
<p>Yenileme adımlarını takip etmek için etkinlik sayfasını ziyaret edin: <a href="{{event_link}}">{{event_link}}</a></p>
""",
    },
    {
        "name": "CRM Takip Maili",
        "subject_tr": "{{event_name}} sonrası kısa takip",
        "subject_en": "Quick follow-up after {{event_name}}",
        "body_html": """
<h2>Merhaba {{recipient_name}},</h2>
<p>{{event_name}} sonrası sizinle tekrar iletişime geçmek istedik.</p>
<p>Sorularınız, eğitim ihtiyaçlarınız veya kurumsal talepleriniz varsa bu e-postayı yanıtlayabilirsiniz.</p>
<p>Saygılarımızla,<br>HeptaCert Ekibi</p>
""",
    },
]
