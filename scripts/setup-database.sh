#!/bin/bash

# =====================================================
# Database Migration and Setup Script
# =====================================================

echo "🚀 Starting Supabase database setup..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "📦 Installing Supabase CLI..."
    
    # Install via Homebrew on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install supabase/tap/supabase
    else
        # For other systems, use npm
        npm install -g supabase
    fi
    
    echo "✅ Supabase CLI installed!"
    echo ""
fi

# Check Supabase version
echo "📌 Supabase CLI version:"
supabase --version
echo ""

# Initialize Supabase (if not already initialized)
if [ ! -d "supabase" ]; then
    echo "🏗️  Initializing Supabase project..."
    supabase init
    echo ""
fi

# Link to remote project
echo "🔗 Linking to Supabase project..."
echo "   Project URL: https://vydkiostfqlsjucyxsph.supabase.co"
echo ""

# Provide instructions for linking
echo "⚠️  To link this project to your Supabase instance, run:"
echo "   supabase link --project-ref vydkiostfqlsjucyxsph"
echo ""

# Check if we're already linked
if supabase db status &> /dev/null; then
    echo "✅ Already linked to Supabase project"
    echo ""
    
    # Push migrations to remote database
    echo "📤 Pushing migrations to remote database..."
    supabase db push
    
    if [ $? -eq 0 ]; then
        echo "✅ Migrations applied successfully!"
    else
        echo "❌ Failed to apply migrations"
        echo "   Try running: supabase db reset"
        exit 1
    fi
else
    echo "⚠️  Not linked to Supabase project yet."
    echo "   Run the link command above, then execute this script again."
    exit 0
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📊 To view your database:"
echo "   supabase db diff"
echo ""
echo "🔍 To inspect tables:"
echo "   Visit: https://vydkiostfqlsjucyxsph.supabase.co/project/vydkiostfqlsjucyxsph/editor"
echo ""

# Optional: Generate types
echo "📝 Generating TypeScript types..."
supabase gen types typescript --linked > src/integrations/supabase/types-generated.ts

if [ $? -eq 0 ]; then
    echo "✅ Types generated successfully!"
else
    echo "⚠️  Failed to generate types (this is optional)"
fi

echo ""
echo "✨ All done! Your database is ready to use."
