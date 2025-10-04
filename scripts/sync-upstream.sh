#!/bin/bash

# Postiz App - Upstream Sync Script
# This script helps manage syncing between upstream, public fork, and private repository

set -e

echo "🔄 Starting upstream sync process..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository!"
    exit 1
fi

# Check if all remotes exist
check_remotes() {
    print_status "Checking remotes..."

    if ! git remote | grep -q "^upstream$"; then
        print_error "upstream remote not found. Please add it with:"
        echo "git remote add upstream https://github.com/gitroomhq/postiz-app.git"
        exit 1
    fi

    if ! git remote | grep -q "^origin$"; then
        print_error "origin remote not found."
        exit 1
    fi

    if ! git remote | grep -q "^private$"; then
        print_error "private remote not found. Please add it with:"
        echo "git remote add private https://github.com/gabelul/postiz-app-private.git"
        exit 1
    fi

    print_success "All remotes configured correctly"
}

# Fetch all remotes
fetch_all() {
    print_status "Fetching from all remotes..."
    git fetch upstream
    git fetch origin
    git fetch private
    print_success "Fetched all remotes"
}

# Sync public fork with upstream
sync_public_fork() {
    print_status "Syncing public fork (main) with upstream..."

    # Switch to main branch
    git checkout main

    # Check if there are uncommitted changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        print_warning "Uncommitted changes detected. Please commit or stash them first."
        return 1
    fi

    # Merge upstream changes
    git merge upstream/main

    # Push to public fork
    git push origin main

    print_success "Public fork synced with upstream"
}

# Show differences between upstream and private
show_diff() {
    print_status "Showing differences between upstream/main and private-main..."

    git checkout private-main
    echo -e "${BLUE}Files modified in private version:${NC}"
    git diff --name-only upstream/main..private-main

    echo -e "${BLUE}Commit differences:${NC}"
    git log --oneline upstream/main..private-main
}

# Merge upstream changes to private branch
merge_to_private() {
    print_status "Merging upstream changes to private-main..."

    git checkout private-main

    # Check if there are uncommitted changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        print_warning "Uncommitted changes detected. Please commit or stash them first."
        return 1
    fi

    # Create a backup branch before merging
    backup_branch="private-main-backup-$(date +%Y%m%d-%H%M%S)"
    git branch $backup_branch
    print_status "Created backup branch: $backup_branch"

    # Merge upstream changes
    if git merge upstream/main; then
        print_success "Successfully merged upstream changes to private-main"

        # Push to private repository
        git push private private-main
        print_success "Pushed updated private-main to private repository"

        # Clean up backup branch
        git branch -d $backup_branch
        print_status "Cleaned up backup branch"
    else
        print_error "Merge conflicts detected. Please resolve them manually."
        print_status "Backup branch created: $backup_branch"
        echo "After resolving conflicts, run: git push private private-main"
        return 1
    fi
}

# Main function to handle command line arguments
main() {
    case "${1:-}" in
        "check")
            check_remotes
            ;;
        "fetch")
            check_remotes
            fetch_all
            ;;
        "sync-public")
            check_remotes
            fetch_all
            sync_public_fork
            ;;
        "show-diff")
            check_remotes
            fetch_all
            show_diff
            ;;
        "merge-private")
            check_remotes
            fetch_all
            merge_to_private
            ;;
        "full-sync")
            check_remotes
            fetch_all
            sync_public_fork
            show_diff
            echo -e "${YELLOW}Review the differences above. Run with 'merge-private' to merge upstream changes to private branch.${NC}"
            ;;
        *)
            echo "Usage: $0 {check|fetch|sync-public|show-diff|merge-private|full-sync}"
            echo ""
            echo "Commands:"
            echo "  check        - Verify all remotes are configured"
            echo "  fetch        - Fetch from all remotes"
            echo "  sync-public  - Sync public fork (main) with upstream"
            echo "  show-diff    - Show differences between upstream and private"
            echo "  merge-private - Merge upstream changes to private-main"
            echo "  full-sync    - Run sync-public and show-diff"
            echo ""
            echo "Typical workflow:"
            echo "  1. $0 full-sync"
            echo "  2. Review differences"
            echo "  3. $0 merge-private (if you want to merge upstream changes)"
            exit 1
            ;;
    esac
}

main "$@"