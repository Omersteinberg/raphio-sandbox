import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveReturnTo } from '@/lib/returnTo';

export default function InsufficientCreditsModal({ required, available, onClose }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Insufficient Credits</h3>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-ink-muted mb-2">
          This action requires <strong>{required}</strong> credit{required !== 1 ? 's' : ''}, but you only have <strong>{available}</strong>.
        </p>
        <p className="text-sm text-ink-muted mb-6">
          Purchase more credits to continue.
        </p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => {
              saveReturnTo(window.location.pathname + window.location.search);
              navigate('/buy-credits');
            }}
            className="flex-1"
          >
            Buy Credits
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
