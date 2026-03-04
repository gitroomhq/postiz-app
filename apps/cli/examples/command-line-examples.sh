#!/bin/bash

# Postiz CLI - Command Line Examples
# Demonstrating the new -c and -m flag syntax

echo "🚀 Postiz CLI Command Line Examples"
echo ""

# Make sure API key is set
if [ -z "$POSTIZ_API_KEY" ]; then
    echo "❌ POSTIZ_API_KEY is not set!"
    echo "Set it with: export POSTIZ_API_KEY=your_api_key"
    exit 1
fi

echo "✅ API key is set"
echo ""

# Example 1: Simple post
echo "📝 Example 1: Simple post"
echo "Command:"
echo 'postiz posts:create -c "Hello World!" -i "twitter-123"'
echo ""

# Example 2: Post with multiple images
echo "📸 Example 2: Post with multiple images"
echo "Command:"
echo 'postiz posts:create \'
echo '  -c "Check out these amazing photos!" \'
echo '  -m "photo1.jpg,photo2.jpg,photo3.jpg" \'
echo '  -i "twitter-123"'
echo ""

# Example 3: Post with comments, each having their own media
echo "💬 Example 3: Post with comments, each having different media"
echo "Command:"
echo 'postiz posts:create \'
echo '  -c "Main post content 🚀" \'
echo '  -m "main-image1.jpg,main-image2.jpg" \'
echo '  -c "First comment with its own image 📸" \'
echo '  -m "comment1-image.jpg" \'
echo '  -c "Second comment with different images 🎨" \'
echo '  -m "comment2-image1.jpg,comment2-image2.jpg" \'
echo '  -i "twitter-123"'
echo ""

# Example 4: Comments with semicolons (no escaping needed!)
echo "🎯 Example 4: Comments can contain semicolons!"
echo "Command:"
echo 'postiz posts:create \'
echo '  -c "Main post" \'
echo '  -c "First comment; notice the semicolon!" \'
echo '  -c "Second comment; with multiple; semicolons; works fine!" \'
echo '  -i "twitter-123"'
echo ""

# Example 5: Twitter thread with custom delay
echo "🧵 Example 5: Twitter thread with 2-second delays"
echo "Command:"
echo 'postiz posts:create \'
echo '  -c "🧵 How to use Postiz CLI (1/5)" \'
echo '  -m "thread-intro.jpg" \'
echo '  -c "Step 1: Install the CLI (2/5)" \'
echo '  -m "step1-screenshot.jpg" \'
echo '  -c "Step 2: Set your API key (3/5)" \'
echo '  -m "step2-screenshot.jpg" \'
echo '  -c "Step 3: Create your first post (4/5)" \'
echo '  -m "step3-screenshot.jpg" \'
echo '  -c "You'\''re all set! 🎉 (5/5)" \'
echo '  -m "done.jpg" \'
echo '  -d 2000 \'
echo '  -i "twitter-123"'
echo ""

# Example 6: Scheduled post with comments
echo "⏰ Example 6: Scheduled post with follow-up comments"
echo "Command:"
echo 'postiz posts:create \'
echo '  -c "Product launch! 🚀" \'
echo '  -m "product-hero.jpg,product-features.jpg" \'
echo '  -c "Special launch offer - 50% off!" \'
echo '  -m "discount-banner.jpg" \'
echo '  -c "Limited time only!" \'
echo '  -s "2024-12-25T09:00:00Z" \'
echo '  -i "twitter-123,linkedin-456"'
echo ""

# Example 7: Multi-platform with same content
echo "🌐 Example 7: Multi-platform posting"
echo "Command:"
echo 'postiz posts:create \'
echo '  -c "Exciting announcement! 🎉" \'
echo '  -m "announcement.jpg" \'
echo '  -c "More details in the comments..." \'
echo '  -m "details-infographic.jpg" \'
echo '  -i "twitter-123,linkedin-456,facebook-789"'
echo ""

# Example 8: Comments without media
echo "💭 Example 8: Main post with media, comments without media"
echo "Command:"
echo 'postiz posts:create \'
echo '  -c "Check out this amazing view! 🏔️" \'
echo '  -m "mountain-photo.jpg" \'
echo '  -c "Taken at sunrise this morning" \'
echo '  -c "Location: Swiss Alps" \'
echo '  -i "twitter-123"'
echo ""

# Example 9: Product tutorial series
echo "📚 Example 9: Product tutorial series"
echo "Command:"
echo 'postiz posts:create \'
echo '  -c "Tutorial: Getting Started with Our Product 📖" \'
echo '  -m "tutorial-cover.jpg" \'
echo '  -c "1. First, download and install the app" \'
echo '  -m "install-screen.jpg" \'
echo '  -c "2. Create your account and set up your profile" \'
echo '  -m "signup-screen.jpg" \'
echo '  -c "3. You'\''re ready to go! Start creating your first project" \'
echo '  -m "dashboard-screen.jpg" \'
echo '  -d 3000 \'
echo '  -i "twitter-123"'
echo ""

# Example 10: Event coverage
echo "📍 Example 10: Live event coverage"
echo "Command:"
echo 'postiz posts:create \'
echo '  -c "Conference 2024 is starting! 🎤" \'
echo '  -m "venue-photo.jpg" \'
echo '  -c "First speaker: Jane Doe talking about AI" \'
echo '  -m "speaker1-photo.jpg" \'
echo '  -c "Second speaker: John Smith on cloud architecture" \'
echo '  -m "speaker2-photo.jpg" \'
echo '  -c "Networking break! Great conversations happening" \'
echo '  -m "networking-photo.jpg" \'
echo '  -d 30000 \'
echo '  -i "twitter-123,linkedin-456"'
echo ""

echo "💡 Tips:"
echo "  - Use multiple -c flags for main post + comments"
echo "  - Use -m flags to specify media for each -c"
echo "  - First -c is the main post, subsequent ones are comments"
echo "  - -m is optional, can be omitted for text-only comments"
echo "  - Use -d to set delay between comments (in milliseconds)"
echo "  - Semicolons and special characters work fine in -c content!"
echo ""
echo "📖 For more examples, see:"
echo "  - examples/EXAMPLES.md - Comprehensive guide"
echo "  - examples/*.json - JSON file examples"
echo "  - SKILL.md - AI agent patterns"
