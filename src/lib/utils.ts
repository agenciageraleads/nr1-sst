import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function validateCNPJ(cnpj: string): boolean {
  const b = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const c = String(cnpj).replace(/[^\d]/g, "");
  
  if (c.length !== 14) return false;

  if (/0{14}|1{14}|2{14}|3{14}|4{14}|5{14}|6{14}|7{14}|8{14}|9{14}/.test(c)) return false;

  let n = 0;
  for (let i = 0; i < 12; i++) {
    n += parseInt(c[i]) * b[i + 1];
  }

  if (parseInt(c[12]) !== (((n %= 11) < 2) ? 0 : 11 - n)) return false;

  n = 0;
  for (let i = 0; i <= 12; i++) {
    n += parseInt(c[i]) * b[i];
  }

  if (parseInt(c[13]) !== (((n %= 11) < 2) ? 0 : 11 - n)) return false;

  return true;
}

export function formatCNPJ(value: string) {
  const cleaned = value.replace(/\D/g, '');
  return cleaned
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
