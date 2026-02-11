#!/bin/bash
# Auto-Backup Script for Phase 2.5 Progress
# Creates backups after each task completion

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/.backups/phase-2.5"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🔄 Creating backup checkpoint..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup progress file
cp "$PROJECT_ROOT/PHASE_2.5_LEARNING_PROGRESS.md" "$BACKUP_DIR/progress_$TIMESTAMP.md"

# Backup critical files
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" \
  "$PROJECT_ROOT/PROJECT_ROADMAP.md" \
  "$PROJECT_ROOT/PROJECT_STATUS.md" \
  "$PROJECT_ROOT/PHASE_3_PLAN.md" \
  "$PROJECT_ROOT/PHASE_2.5_LEARNING_PROGRESS.md" \
  "$PROJECT_ROOT/services/handoff-api/src/" \
  "$PROJECT_ROOT/services/chatbot/src/"

# Create recovery info
cat > "$BACKUP_DIR/recovery_$TIMESTAMP.txt" <<EOF
Phase 2.5 Recovery Information
================================
Backup Date: $(date)
Timestamp: $TIMESTAMP
Git Commit: $(git rev-parse HEAD)
Git Branch: $(git branch --show-current)

To Recover:
1. Untar: tar -xzf backup_$TIMESTAMP.tar.gz
2. Read: progress_$TIMESTAMP.md
3. Continue from last completed task
EOF

# Keep only last 10 backups
ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +11 | xargs rm -f
ls -t "$BACKUP_DIR"/progress_*.md | tail -n +11 | xargs rm -f

echo "✅ Backup created: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
echo "📊 Recovery info: $BACKUP_DIR/recovery_$TIMESTAMP.txt"
