"""Seed richer system email template presets.

Revision ID: 065_system_email_template_presets
Revises: 064_phase16_platform_packaging_qa
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa


revision = "065_system_email_template_presets"
down_revision = "064_phase16_platform_packaging_qa"
branch_labels = None
depends_on = None


PRESETS = [
    (
        "Sertifika Teslimi",
        "Sertifikanız hazır | {{event_name}}",
        "Your certificate is ready | {{event_name}}",
        "<h2>Merhaba {{recipient_name}},</h2><p>{{event_name}} etkinliğine katılımınız için teşekkürler. Sertifikanız hazır.</p><p><a href=\"{{certificate_link}}\">Sertifikanızı görüntüleyin</a></p>",
    ),
    (
        "Kayıt Onayı",
        "Kaydınız alındı | {{event_name}}",
        "Registration confirmed | {{event_name}}",
        "<h2>Merhaba {{recipient_name}},</h2><p>{{event_name}} etkinliği için kaydınız başarıyla alındı.</p><p>Etkinlik sayfası: <a href=\"{{event_link}}\">{{event_link}}</a></p>",
    ),
    (
        "Katılım Teşekkürü",
        "Katıldığınız için teşekkürler | {{event_name}}",
        "Thanks for attending | {{event_name}}",
        "<h2>Merhaba {{recipient_name}},</h2><p>{{event_name}} etkinliğine katıldığınız için teşekkür ederiz.</p><p>Sunumlar, sertifikalar veya topluluk güncellemeleri hazır olduğunda sizi bilgilendireceğiz.</p>",
    ),
    (
        "No-show Takibi",
        "{{event_name}} etkinliğini kaçırdınız mı?",
        "Did you miss {{event_name}}?",
        "<h2>Merhaba {{recipient_name}},</h2><p>{{event_name}} için kaydınız vardı fakat katılım kaydı göremedik.</p><p>Gelecek programları buradan takip edebilirsiniz: <a href=\"{{event_link}}\">{{event_link}}</a></p>",
    ),
    (
        "Anket Hatırlatma",
        "Kısa anketinizi tamamlar mısınız? | {{event_name}}",
        "Please complete your short survey | {{event_name}}",
        "<h2>Merhaba {{recipient_name}},</h2><p>{{event_name}} deneyiminizi iyileştirmek için kısa geri bildiriminize ihtiyacımız var.</p><p>Anket bağlantısı: <a href=\"{{survey_link}}\">{{survey_link}}</a></p>",
    ),
    (
        "LinkedIn Paylaşım Daveti",
        "Başarınızı LinkedIn'de paylaşın | {{event_name}}",
        "Share your achievement on LinkedIn | {{event_name}}",
        "<h2>Merhaba {{recipient_name}},</h2><p>{{event_name}} sertifikanız hazır. İsterseniz başarınızı LinkedIn'de paylaşabilirsiniz.</p><p><a href=\"{{linkedin_share_link}}\">LinkedIn paylaşımı oluştur</a></p>",
    ),
    (
        "Rozet Kazanımı",
        "Yeni rozet kazandınız | {{event_name}}",
        "You earned a new badge | {{event_name}}",
        "<h2>Tebrikler {{recipient_name}},</h2><p>{{event_name}} kapsamında yeni bir rozet kazandınız.</p><p>Profilinizde rozetlerinizi ve sertifikalarınızı görüntüleyebilirsiniz: <a href=\"{{wallet_link}}\">{{wallet_link}}</a></p>",
    ),
    (
        "Sertifika Yenileme Hatırlatma",
        "Sertifikanızın süresi yaklaşıyor | {{event_name}}",
        "Your certificate is expiring soon | {{event_name}}",
        "<h2>Merhaba {{recipient_name}},</h2><p>{{event_name}} sertifikanızın geçerlilik süresi yaklaşıyor.</p><p>Yenileme adımlarını takip etmek için etkinlik sayfasını ziyaret edin: <a href=\"{{event_link}}\">{{event_link}}</a></p>",
    ),
    (
        "CRM Takip Maili",
        "{{event_name}} sonrası kısa takip",
        "Quick follow-up after {{event_name}}",
        "<h2>Merhaba {{recipient_name}},</h2><p>{{event_name}} sonrası sizinle tekrar iletişime geçmek istedik.</p><p>Sorularınız, eğitim ihtiyaçlarınız veya kurumsal talepleriniz varsa bu e-postayı yanıtlayabilirsiniz.</p>",
    ),
]


def upgrade() -> None:
    bind = op.get_bind()
    creator_id = bind.execute(
        sa.text("select id from users where role in ('superadmin', 'admin') order by case when role = 'superadmin' then 0 else 1 end, id limit 1")
    ).scalar()
    if not creator_id:
        return

    existing = {
        row[0]
        for row in bind.execute(
            sa.text("select name from email_templates where template_type = 'system' and is_default = true")
        ).all()
    }
    rows = [
        {
            "event_id": None,
            "created_by": creator_id,
            "name": name,
            "subject_tr": subject_tr,
            "subject_en": subject_en,
            "body_html": body_html,
            "template_type": "system",
            "is_default": True,
        }
        for name, subject_tr, subject_en, body_html in PRESETS
        if name not in existing
    ]
    if rows:
        op.bulk_insert(
            sa.table(
                "email_templates",
                sa.column("event_id", sa.Integer),
                sa.column("created_by", sa.Integer),
                sa.column("name", sa.String),
                sa.column("subject_tr", sa.String),
                sa.column("subject_en", sa.String),
                sa.column("body_html", sa.Text),
                sa.column("template_type", sa.String),
                sa.column("is_default", sa.Boolean),
            ),
            rows,
        )


def downgrade() -> None:
    names = [item[0] for item in PRESETS]
    op.execute(
        sa.text("delete from email_templates where template_type = 'system' and name = any(:names)")
        .bindparams(sa.bindparam("names", value=names, type_=sa.ARRAY(sa.String())))
    )
