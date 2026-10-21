import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';

export function MessageTicks({ status }) {
  if (status === 'pending') {
    return <Clock className="w-3 h-3 text-gray-400 inline-block ml-1" />;
  }

  if (status === 'read') {
    return <CheckCheck className="w-3.5 h-3.5 text-wa-blue-tick inline-block ml-1" />;
  }

  if (status === 'delivered') {
    return <CheckCheck className="w-3.5 h-3.5 text-gray-400 dark:text-wa-dark-muted inline-block ml-1" />;
  }

  // Sent (single check)
  return <Check className="w-3.5 h-3.5 text-gray-400 dark:text-wa-dark-muted inline-block ml-1" />;
}
