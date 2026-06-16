import { Redis } from "@upstash/redis";

let _r: Redis | null = null;
export function redis(): Redis {
  if (_r) return _r;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis nao configurado (KV_REST_API_URL/TOKEN)");
  _r = new Redis({ url, token });
  return _r;
}
