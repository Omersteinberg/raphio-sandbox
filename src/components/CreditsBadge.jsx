import { useAuth } from '../hooks/useAuth.jsx';

export default function CreditsBadge() {
  const { credits } = useAuth();

  if (credits === null) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-sm font-medium text-gray-700">
      <span className="text-primary font-bold">{credits}</span>
      <span>credits</span>
    </div>
  );
}
