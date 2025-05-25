
// Simple in-memory rate limiting (for production, use Redis)
const requestCounts = new Map();

export function rateLimit(identifier: string, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean old entries
  for (const [key, data] of requestCounts.entries()) {
    if (data.timestamp < windowStart) {
      requestCounts.delete(key);
    }
  }
  
  const current = requestCounts.get(identifier) || { count: 0, timestamp: now };
  
  if (current.timestamp < windowStart) {
    // Reset if outside window
    requestCounts.set(identifier, { count: 1, timestamp: now });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  requestCounts.set(identifier, { count: current.count + 1, timestamp: current.timestamp });
  return true;
}
