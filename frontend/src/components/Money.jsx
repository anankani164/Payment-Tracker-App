import React from 'react';
import { fmtMoney } from '../utils/format';

/**
 * <Money value={12345.67} /> -> "GHS 12,345.67"
 * <Money value={12345.67} useSymbol /> -> "GH₵12,345.67" (if symbol available)
 */
export default function Money({ value, currency='GHS', decimals=2, useSymbol=false, style={}, className='' }){
  try{
    return <span className={className} style={style}>{fmtMoney(value, currency, {decimals, useSymbol})}</span>;
  }catch(_){
    return <span className={className} style={style}>{value}</span>;
  }
}
