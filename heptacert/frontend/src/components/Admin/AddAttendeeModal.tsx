"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Loader2, AlertCircle } from "lucide-react";
import { createManualAttendee } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useI18n, translate } from "@/lib/i18n";

interface AddAttendeeModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  eventId: number;
}

export default function AddAttendeeModal({ open, onClose, onAdded, eventId }: AddAttendeeModalProps) {
  const { lang } = useI18n();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const copy = { title: translate(lang, "migrated_components_admin_addattendeemodal_add_attendee_9eb0c8fb"), emailLabel: translate(lang, "migrated_components_admin_addattendeemodal_email_6d2c2e13"), emailPlaceholder: translate(lang, "migrated_components_admin_addattendeemodal_example_mail_com_87fee230"), firstNameLabel: translate(lang, "migrated_components_admin_addattendeemodal_first_name_38f7e500"), lastNameLabel: translate(lang, "migrated_components_admin_addattendeemodal_last_name_60c6cabe"), required: translate(lang, "migrated_components_admin_addattendeemodal_email_first_name_and_last_name_are_require_9d8b853a"), add: translate(lang, "migrated_components_admin_addattendeemodal_add_attendee_ddceaa0a"), adding: translate(lang, "migrated_components_admin_addattendeemodal_adding_e27df22c"), added: translate(lang, "migrated_components_admin_addattendeemodal_attendee_added_successfully_b7ac7f8e"), failed: translate(lang, "migrated_components_admin_addattendeemodal_failed_to_add_attendee_c4aae044") };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setErr(copy.required);
      return;
    }
    setErr(null);
    setAdding(true);
    try {
      await createManualAttendee(eventId, {
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      toast.success(copy.added);
      setEmail(""); setFirstName(""); setLastName("");
      onAdded();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || copy.failed;
      setErr(msg);
    } finally {
      setAdding(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }} className="relative w-full max-w-md overflow-hidden rounded-2xl border border-surface-200 bg-raised shadow-modal">
            <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-200 bg-surface-50">
                  <UserPlus className="h-3.5 w-3.5 text-surface-600" />
                </div>
                <h2 className="text-sm font-semibold text-surface-900">{copy.title}</h2>
              </div>
              <button onClick={onClose} aria-label={translate(lang, "migrated_components_admin_addattendeemodal_close_81548374")} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 transition-colors"><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div className="space-y-1.5">
                <label className="label">{copy.emailLabel}</label>
                <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={copy.emailPlaceholder} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="label">{copy.firstNameLabel}</label>
                  <input type="text" className="input-field" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">{copy.lastNameLabel}</label>
                  <input type="text" className="input-field" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              {err && <div className="error-banner text-xs"><AlertCircle className="h-3.5 w-3.5 shrink-0" /><span>{err}</span></div>}
              <div className="border-t border-surface-100 pt-4">
                <button type="submit" disabled={adding} className="btn-primary w-full justify-center">
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {adding ? copy.adding : copy.add}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
