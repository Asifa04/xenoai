import { db } from '../db';
import { sql } from 'drizzle-orm';

type Condition = { field: string; op: string; value: number | string | string[] };
type Rules = { operator: 'AND' | 'OR'; conditions: Condition[] };

const opMap: Record<string, string> = { gt: '>', lt: '<', gte: '>=', lte: '<=', eq: '=' };

function buildConditionSQL(cond: Condition): string {
  const { field, op, value } = cond;
  if (field === 'totalSpend') return `(SELECT COALESCE(SUM(order_amount),0) FROM orders o WHERE o.customer_id = c.id) ${opMap[op] || '>'} ${Number(value)}`;
  if (field === 'orderCount') return `(SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) ${opMap[op] || '>'} ${Number(value)}`;
  if (field === 'daysSinceLastOrder') return `EXTRACT(EPOCH FROM (NOW() - (SELECT MAX(order_date) FROM orders o WHERE o.customer_id = c.id))) / 86400 ${opMap[op] || '>'} ${Number(value)}`;
  if (field === 'daysSinceSignup') return `EXTRACT(EPOCH FROM (NOW() - c.signup_date)) / 86400 ${opMap[op] || '>'} ${Number(value)}`;
  if (field === 'city' && op === 'in' && Array.isArray(value)) return `LOWER(c.city) IN (${(value as string[]).map(v => `'${v.toLowerCase()}'`).join(',')})`;
  if (field === 'city') return `LOWER(c.city) = '${String(value).toLowerCase()}'`;
  if (field === 'gender') return `c.gender = '${value}'`;
  return '1=1';
}

export async function evaluateSegment(rules: Rules): Promise<string[]> {
  const parts = rules.conditions.map(buildConditionSQL);
  if (!parts.length) return [];
  const joined = parts.join(rules.operator === 'AND' ? ' AND ' : ' OR ');
  const result = await db.execute(sql.raw(`SELECT c.id FROM customers c WHERE ${joined}`));
  return (result.rows as { id: string }[]).map(r => r.id);
}
