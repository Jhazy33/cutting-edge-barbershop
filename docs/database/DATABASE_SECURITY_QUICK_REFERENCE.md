# Database Security Quick Reference
**Cutting Edge Barbershop - NeXXT Project**

## Emergency Commands

### Check if database is exposed
```bash
# From your local machine
nmap -p 5432 109.199.118.38

# From VPS
ss -tlnp | grep 5432
```

### Stop brute force attacks immediately
```bash
# Block port 5432 from public access
ufw deny 5432
ufw reload
```

### Change database password
```bash
# Generate new password
openssl rand -base64 48 | tr -d '/+=' | head -c 48

# Connect to PostgreSQL
docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db

# Change password
ALTER USER jhazy WITH PASSWORD 'new_password_here';
```

### Fix backup script
```bash
# Edit backup script
nano /root/scripts/backup-nexxt-db.sh

# Change these lines:
DB_USER="jhazy"           # Was "postgres"
DB_NAME="nexxt_db"        # Was "postgres"
export PGPASSWORD="xxx"   # Update with correct password

# Test backup
/root/scripts/backup-nexxt-db.sh
```

---

## Monitoring Commands

### Check active connections
```bash
docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c \
  "SELECT pid, usename, application_name, client_addr, state FROM pg_stat_activity WHERE datname='nexxt_db';"
```

### Check for failed authentication
```bash
docker logs nexxt_whatsgoingon-postgres-1 2>&1 | grep "FATAL" | tail -20
```

### Check slow queries
```sql
-- First enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Then query
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Check table sizes
```bash
docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c \
  "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_tables WHERE schemaname NOT IN ('tiger', 'topology') ORDER BY pg_total_relation_size DESC;"
```

---

## Security Verification

### Verify pg_hba.conf
```bash
# Check current config
docker exec nexxt_whatsgoingon-postgres-1 cat /var/lib/postgresql/data/pg_hba.conf

# Should only allow:
# - 127.0.0.1/32 (localhost)
# - 172.16.0.0/12 (Docker network)
```

### Verify no public access
```bash
# From external machine (should fail)
psql -h 109.199.118.38 -p 5432 -U jhazy -d nexxt_db

# Should get: "connection refused" or "timeout"
```

### Test backup restore
```bash
# List backups
ls -lh /root/backups/nexxt/daily/

# Test restore to temp database
gunzip -c /root/backups/nexxt/daily/nexxt_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db_test
```

---

## RBAC Setup

### Create application roles
```sql
-- Read-only user
CREATE ROLE nexxt_readonly WITH LOGIN PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE nexxt_db TO nexxt_readonly;
GRANT USAGE ON SCHEMA public TO nexxt_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO nexxt_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO nexxt_readonly;

-- Application user (read-write)
CREATE ROLE nexxt_app WITH LOGIN PASSWORD 'app_password';
GRANT CONNECT ON DATABASE nexxt_db TO nexxt_app;
GRANT USAGE ON SCHEMA public TO nexxt_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexxt_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nexxt_app;
```

### Set connection limits
```sql
ALTER ROLE nexxt_app CONNECTION LIMIT 10;
ALTER ROLE nexxt_readonly CONNECTION LIMIT 5;
```

### Update applications to use new roles
```bash
# Update .env files
DATABASE_URL=postgresql://nexxt_app:app_password@postgres:5432/nexxt_db
```

---

## Troubleshooting

### Can't connect to database
```bash
# Check if container is running
docker ps | grep postgres

# Check logs
docker logs nexxt_whatsgoingon-postgres-1 --tail 50

# Test connection from inside container
docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db
```

### Backup script failing
```bash
# Run manually to see errors
bash -x /root/scripts/backup-nexxt-db.sh

# Check credentials
cat /root/scripts/backup-nexxt-db.sh | grep -E "DB_|PGPASSWORD"

# Test connection
docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c "SELECT 1;"
```

### Applications can't connect after password change
```bash
# Update all .env files with new password
cd /root/NeXXT_WhatsGoingOn
find . -name ".env*" -type f -exec sed -i "s/OLD_PASSWORD/NEW_PASSWORD/g" {} \;

# Restart services
docker restart nexxt_whatsgoingon-web-1
pm2 restart all
```

---

## Maintenance Tasks

### Weekly
- Review authentication failures: `docker logs nexxt_whatsgoingon-postgres-1 2>&1 | grep FATAL`
- Check backup sizes: `ls -lh /root/backups/nexxt/daily/`
- Verify no new users: `docker exec nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c "\du"`

### Monthly
- Test backup restore procedure
- Review query performance
- Check database growth
- Audit user permissions

### Quarterly
- Rotate database password
- Review and update security policies
- Disaster recovery test

---

## Important Files

| File | Purpose |
|------|---------|
| `/root/NeXXT_WhatsGoingOn/docker-compose.yml` | Main configuration |
| `/root/scripts/backup-nexxt-db.sh` | Backup automation |
| `/root/.secrets/postgres_password` | Stored password (create this) |
| `/var/lib/postgresql/data/pg_hba.conf` | Access control (in container) |
| `/var/log/nexxt-backup.log` | Backup logs |
| `/root/backups/nexxt/` | Backup storage |

---

## Security Checklist

### Immediate (Do Today)
- [ ] Block port 5432 from internet: `ufw deny 5432`
- [ ] Change database password
- [ ] Fix backup script
- [ ] Remove credentials from git history
- [ ] Add *.env to .gitignore

### Short-Term (This Week)
- [ ] Implement RBAC (app, readonly, admin roles)
- [ ] Restrict pg_hba.conf to Docker network only
- [ ] Set connection limits
- [ ] Enable query logging
- [ ] Test all applications with new credentials

### Medium-Term (This Month)
- [ ] Enable SSL/TLS
- [ ] Implement monitoring
- [ ] Encrypt backups
- [ ] Implement row-level security
- [ ] Document security procedures

---

## Contacts & Resources

**Full Report**: `DATABASE_SECURITY_REPORT.md`
**Fix Script**: `DATABASE_SECURITY_FIX.sh`
**VPS Access**: `ssh contabo-vps`
**Container**: `nexxt_whatsgoingon-postgres-1`

**PostgreSQL Docs**: https://www.postgresql.org/docs/15/
**Docker Security**: https://docs.docker.com/engine/security/

---

*Last Updated: 2026-02-11*
*Database Architect: Claude Code (database-architect agent)*
