/**
 * PII Blocker - Regex-based PII detection
 * Detects SSN, email, phone, credit card, DOB, IP patterns
 */
function evaluate(input, config) {
  const results = { pii_risk: 0, total_pii_count: 0 };
  const patterns = {
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    credit_card: /\b(?:\d{4}[- ]?){3}\d{4}\b/g,
    dob: /\b(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])\/(?:19|20)\d{2}\b/g,
    ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
  };

  const text = typeof input === 'string' ? input : JSON.stringify(input);
  let totalCount = 0;

  for (const [name, regex] of Object.entries(patterns)) {
    const matches = text.match(regex) || [];
    results[`${name}_count`] = matches.length;
    totalCount += matches.length;
  }

  results.total_pii_count = totalCount;
  results.pii_risk = totalCount > 0 ? Math.min(1.0, totalCount * 0.25) : 0;

  return results;
}

module.exports = { evaluate };
