# Database Quick Reference Guide

**Last Updated**: 2026-02-11
**VPS**: 109.199.118.38

---

## Database Connections

### NeXXT Database (Port 5432)
```bash
# Via Docker
docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db

# From local machine (after SSH tunnel)
ssh -L 5432:localhost:5432 root@109.199.118.38
psql -h localhost -U jhazy -d nexxt_db -p 5432

# Connection String
postgresql://jhazy:C0ZzJ+dIB9ViFSBUBK5vU+HzijtK6T7Q8VDM8guFMQI=@localhost:5432/nexxt_db
```

### Supabase Database (Port 5433 external, 5432 internal)
```bash
# Via Docker
docker exec -it supabase-db psql -U postgres -d postgres

# Connection String
postgresql://postgres@localhost:5432/postgres
```

---

## Common Operations

### Create Backup
```bash
# NeXXT Database
docker exec nexxt_whatsgoingon-postgres-1 pg_dump -U jhazy nexxt_db > backup.sql

# Supabase Database
docker exec supabase-db pg_dump -U postgres postgres > backup.sql

# With timestamp
docker exec nexxt_whatsgoingon-postgres-1 pg_dump -U jhazy nexxt_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Backup
```bash
# NeXXT Database
docker exec -i nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db < backup.sql

# Supabase Database
docker exec -i supabase-db psql -U postgres -d postgres < backup.sql
```

### Check Table Structure
```bash
docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c '\d+ table_name'
```

### List All Tables
```bash
docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c '\dt'
```

### List All Functions
```bash
docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c '\df'
```

### Check Indexes
```bash
docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c '\di'
```

### Reload Configuration
```bash
docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c 'SELECT pg_reload_conf();'
```

---

## Supabase RAG Schema Reference

### Test Vector Search
```sql
-- Test search_knowledge_base function
SELECT * FROM search_knowledge_base(
  1,                                    -- shop_id
  '[0.1,0.2,0.3]'::vector,              -- query_vector (768 dimensions)
  10,                                   -- limit
  NULL,                                 -- category (null = all)
  0.0                                   -- threshold
);
```

### Add Knowledge Entry
```sql
-- Insert knowledge base entry (without embedding for now)
INSERT INTO knowledge_base_rag (shop_id, category, content, source)
VALUES (1, 'services', 'Haircut services available', 'manual');
```

### Check Embedding Generation
```bash
# Use Ollama to generate embeddings on VPS
ssh contabo-vps "curl http://localhost:11434/api/embeddings -d '{\"model\":\"nomic-embed-text\",\"prompt\":\"Your text here\"}'"
```

---

## Monitoring Commands

### Check Database Size
```bash
docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c "
SELECT pg_size_pretty(pg_database_size('nexxt_db')) as db_size;
"
```

### Check Table Sizes
```bash
docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c "
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### Check Active Connections
```bash
docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c "
SELECT count(*) as connections, state
FROM pg_stat_activity
WHERE datname = 'nexxt_db'
GROUP BY state;
"
```

### Check Slow Queries
```bash
docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"
```

---

## Security Commands

### Change Password
```bash
docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c "ALTER USER jhazy WITH PASSWORD 'new_password';"
```

### Check pg_hba.conf
```bash
docker exec nexxt_whatsgoingon-postgres-1 cat /var/lib/postgresql/data/pg_hba.conf
```

### Check UFW Rules
```bash
ssh contabo-vps "ufw status"
```

### Block Port from External
```bash
ssh contabo-vps "ufw deny 5432/tcp"
```

---

## PM2 Service Management

### Restart All Services
```bash
ssh contabo-vps "pm2 restart all"
```

### Restart Specific Service
```bash
ssh contabo-vps "pm2 restart web"
```

### Check Service Status
```bash
ssh contabo-vps "pm2 status"
```

### View Logs
```bash
# All logs
ssh contabo-vps "pm2 logs"

# Specific service
ssh contabo-vps "pm2 logs web"

# Error logs only
ssh contabo-vps "pm2 logs --err"

# Last N lines
ssh contabo-vps "pm2 logs --lines 50"
```

---

## Vector Operations

### Check pgvector Version
```bash
docker exec supabase-db psql -U postgres -d postgres -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"
```

### Calculate Similarity Manually
```sql
-- Cosine similarity (lower distance = higher similarity)
SELECT 1 - (embedding <=> '[0.1,0.2,0.3]'::vector) as similarity
FROM knowledge_base_rag
WHERE shop_id = 1;
```

### Update HNSW Index Parameters
```sql
-- Drop and recreate with different parameters
DROP INDEX IF EXISTS idx_knowledge_base_rag_embedding_hnsw;
CREATE INDEX idx_knowledge_base_rag_embedding_hnsw
ON knowledge_base_rag
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 128);  -- Higher values = better accuracy, slower build
```

---

## Troubleshooting

### Connection Refused
1. Check if container is running: `docker ps | grep postgres`
2. Check UFW rules: `ufw status`
3. Check pg_hba.conf: Review connection permissions
4. Reload config: `SELECT pg_reload_conf();`

### Function Does Not Exist
1. Check function exists: `\df function_name`
2. Check database: `\c database_name`
3. Check schema: `SELECT * FROM pg_proc WHERE proname = 'function_name';`

### Slow Vector Search
1. Check HNSW index: `\di | grep hnsw`
2. Check index usage: `EXPLAIN ANALYZE SELECT ...`
3. Consider increasing `m` or `ef_construction` parameters

### Permission Denied
1. Check user permissions: `\du`
2. Grant privileges if needed: `GRANT ALL PRIVILEGES ON TABLE table_name TO user;`
3. Check database owner: `SELECT * FROM pg_database WHERE datname = 'db_name';`

---

## Backup Locations

### NeXXT Database Backups
```bash
/root/nexxt_db_backup_*.sql
```

### Supabase Database Backups
```bash
/root/supabase_db_backup_*.sql
```

### Configuration Backups
```bash
/root/NeXXT_WhatsGoingOn/.env.bak
/root/NeXXT_WhatsGoingOn/packages/db/.env.bak
```

---

## Important Notes

### Password Storage
- NeXXT DB password: Check `.env` files (updated 2026-02-11)
- Supabase DB: Uses trust authentication locally
- Never commit passwords to Git!

### Port Bindings
- NeXXT: 5432 (BLOCKED externally by UFW)
- Supabase: 5432 (internal Docker only)

### Extensions Installed
- NeXXT: postgis, postgis_topology, fuzzystrmatch
- Supabase: vector (pgvector), pg_graphql, pg_net, pgcrypto, pgjwt, uuid-ossp, supabase_vault

### Vector Dimensions
- Model: nomic-embed-text
- Dimensions: 768
- Index Type: HNSW (vector_cosine_ops)

---

## Quick Links

- **Full Report**: `DATABASE_FIXES_COMPLETE.md`
- **Project Status**: `PROJECT_STATUS.md`
- **VPS Connection**: `ssh contabo-vps`
- **Supabase Studio**: https://supabase.cihconsultingllc.com

---

**Last Updated**: 2026-02-11
**Status**: All systems operational
