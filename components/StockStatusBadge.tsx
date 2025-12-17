import React from 'react';
import { StockLevel } from '../types';
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

interface Props {
  status: StockLevel;
}

const StockStatusBadge: React.FC<Props> = ({ status }) => {
  let colorClass = '';
  let text = '';
  let Icon = CheckCircle2;

  switch (status) {
    case StockLevel.SAFE:
      colorClass = 'bg-emerald-100 text-emerald-800';
      text = '여유';
      Icon = CheckCircle2;
      break;
    case StockLevel.WARNING:
      colorClass = 'bg-amber-100 text-amber-800';
      text = '주의';
      Icon = AlertTriangle;
      break;
    case StockLevel.CRITICAL:
      colorClass = 'bg-rose-100 text-rose-800';
      text = '위험';
      Icon = AlertCircle;
      break;
    case StockLevel.OUT_OF_STOCK:
      colorClass = 'bg-gray-100 text-gray-800';
      text = '품절';
      Icon = XCircle;
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      <Icon className="w-3.5 h-3.5" />
      {text}
    </span>
  );
};

export default StockStatusBadge;