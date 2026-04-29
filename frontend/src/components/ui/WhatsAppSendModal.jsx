import { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';

/**
 * Modal to collect/confirm the WhatsApp phone number before sending a file.
 * Props:
 *   phone       – initial phone value (may be empty)
 *   onClose     – called when the user cancels
 *   onSend(phone) – async; called with the phone number when user confirms.
 *                   The parent is responsible for closing the modal (via setWhatsappModal(null)).
 */
export default function WhatsAppSendModal({ phone: initialPhone = '', onClose, onSend }) {
  const [phone, setPhone] = useState(initialPhone);
  const [isSending, setIsSending] = useState(false);

  const handleSend = () => {
    if (!phone.trim() || isSending) return;
    setIsSending(true);
    // Fire the async parent handler; it will close the modal via setWhatsappModal(null).
    // We do NOT call onClose() here so the loading UI stays visible during the async work.
    onSend(phone.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-500" />
          Envoyer via WhatsApp
        </h3>
        <p className="text-sm text-gray-500">
          Numéro WhatsApp du destinataire (avec indicatif pays, ex.&nbsp;+243812345678).
          Modifiez-le si nécessaire avant d&apos;envoyer.
        </p>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="+243..."
          autoFocus
          disabled={isSending}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:opacity-60"
        />
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!phone.trim() || isSending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...</>
            ) : (
              <><MessageCircle className="w-4 h-4" /> Envoyer</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
