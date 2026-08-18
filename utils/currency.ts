
/**
 * Parses a string or number from various formats (including Brazilian currency) into a clean number.
 * Handles null, undefined, empty strings, "R$", spaces, and both Brazilian (,) and American (.) decimal/thousand separators.
 * @param valor The value to parse.
 * @returns The parsed number, or 0 if the input is invalid.
 */
export const limparNumero = (valor: any): number => {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return valor;
  
  let s = String(valor).replace(/[R$\s]/g, ''); // Remove R$ e espaços
  
  // Padrão BR: 1.250,50 ou 71,83
  // Se houver vírgula, tratamos como separador decimal
  if (s.includes(',')) {
    // Remove pontos de milhar se existirem e troca vírgula por ponto
    s = s.replace(/\./g, '').replace(',', '.');
  }
  
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
};
