from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

OUTPUT = Path("Postiz_Visual_Workflow_and_AI_Cost_Guide.docx")
doc = Document()
section = doc.sections[0]
section.top_margin = Inches(0.65)
section.bottom_margin = Inches(0.65)
section.left_margin = Inches(0.75)
section.right_margin = Inches(0.75)

doc.styles["Normal"].font.name = "Aptos"
doc.styles["Normal"].font.size = Pt(10.5)
for style_name, size, colour in [
    ("Title", 26, "5B21B6"),
    ("Heading 1", 17, "4C1D95"),
    ("Heading 2", 13, "6D28D9"),
]:
    style = doc.styles[style_name]
    style.font.name = "Aptos Display"
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor.from_string(colour)


def shade(cell, colour):
    props = cell._tc.get_or_add_tcPr()
    value = OxmlElement("w:shd")
    value.set(qn("w:fill"), colour)
    props.append(value)


def table(headers, rows):
    grid = doc.add_table(rows=1, cols=len(headers))
    grid.alignment = WD_TABLE_ALIGNMENT.CENTER
    grid.style = "Table Grid"
    for index, heading in enumerate(headers):
        cell = grid.rows[0].cells[index]
        cell.text = ""
        run = cell.paragraphs[0].add_run(heading)
        run.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)
        shade(cell, "5B21B6")
    for row_index, row in enumerate(rows):
        cells = grid.add_row().cells
        for index, text in enumerate(row):
            cells[index].text = text
            cells[index].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if row_index % 2 == 1:
                shade(cells[index], "F5F3FF")
    doc.add_paragraph()


def paragraph(text):
    result = doc.add_paragraph(text)
    result.paragraph_format.space_after = Pt(6)


def bullets(items):
    for item in items:
        doc.add_paragraph(item, style="List Bullet")


def steps(items):
    for item in items:
        doc.add_paragraph(item, style="List Number")


def code(text):
    result = doc.add_paragraph()
    result.paragraph_format.left_indent = Inches(0.25)
    run = result.add_run(text)
    run.font.name = "Consolas"
    run.font.size = Pt(9)
    props = result._p.get_or_add_pPr()
    value = OxmlElement("w:shd")
    value.set(qn("w:fill"), "F3F4F6")
    props.append(value)


cover = doc.add_paragraph()
cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = cover.add_run("POSTIZ")
run.font.name = "Aptos Display"
run.font.size = Pt(34)
run.font.bold = True
run.font.color.rgb = RGBColor.from_string("6D28D9")
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run("Self-Hosted Docker Workflow Guide")
run.font.name = "Aptos Display"
run.font.size = Pt(24)
run.font.bold = True
sub = doc.add_paragraph("AI content, Gemini media, local storage, social publishing, and operations")
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
sub.runs[0].italic = True
date = doc.add_paragraph("Project: postiz-test-docker-update | Detailed edition | Updated: 19 August 2026")
date.alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph()

doc.add_heading("1. Purpose", level=1)
paragraph("This guide explains the customized self-hosted Postiz installation, Docker services, AI content and image workflow, local-media publishing path, and day-to-day operating steps. No live credentials are included in this document.")

doc.add_heading("2. Architecture", level=1)
table(["Component", "Responsibility", "Access"], [
    ("Postiz application", "Social scheduling UI and API.", "http://localhost:4007"),
    ("Admin UI", "Provider credentials, AI settings, Docker operations and health views.", "http://localhost:3001"),
    ("PostgreSQL", "Persistent application database.", "postgres_data volume"),
    ("Redis", "Cache and job support.", "redis_data volume"),
    ("Temporal + UI", "Runs scheduled/background workflows.", "Temporal UI: http://localhost:8082"),
    ("Local uploads", "Stores generated/uploaded media at /uploads.", "postiz_uploads volume"),
    ("ngrok (optional)", "Provides HTTPS access to local media for social platforms.", "Inspector: http://localhost:4040"),
])

doc.add_heading("2.1 Visual walkthrough", level=2)
paragraph("The following real login capture was taken from the running local Postiz stack. Enter your registered email and password, then select Sign in. New installations can use Sign Up first to create the initial account.")
doc.add_picture("docs-auth-login.png", width=Inches(6.75))
caption = doc.add_paragraph("Screenshot 1 — Postiz Sign In screen (local installation)")
caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
caption.runs[0].italic = True
paragraph("After signing in, open Calendar and select Create Post. The workflow map below explains where the channel selector, AI controls, manual composer, media thumbnails, preview, scheduling, and publishing actions appear.")
doc.add_picture("docs-create-post-workflow-map.png", width=Inches(6.75))
caption = doc.add_paragraph("Figure 1 — Annotated Create Post workflow map (illustrative; labels match the installed workflow)")
caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
caption.runs[0].italic = True

doc.add_heading("3. Content and media workflow", level=1)
steps([
    "Connect Facebook Pages and Instagram professional accounts from Postiz using the configured Meta application.",
    "Create a post manually, generate a complete caption with AI, or rewrite existing manual text using the selected provider, model, and mood.",
    "When Generate Gemini image(s) is enabled, Gemini creates one or more distinct variants from the visual prompt. Postiz saves the selected files in its local uploads volume and attaches them to the draft.",
    "Use Preview Post to inspect the caption and attached image carousel before scheduling. Remove or replace images as needed.",
    "Save a draft or schedule it. Temporal executes the job at the selected date and time, and the Calendar reflects its state.",
    "For Facebook and Instagram publishing, Postiz supplies an HTTPS URL for every local media file. The platform downloads the file and creates the native social post.",
])

doc.add_heading("4. AI provider behavior", level=1)
table(["Function", "Provider", "Result"], [
    ("Generate AI Post", "Configured text provider", "Caption, hook, body, hashtags and call to action."),
    ("Rewrite Manual Post", "OpenAI or Gemini chosen in the composer", "Existing text is rewritten in the selected mood/style."),
    ("Generate image(s)", "Gemini image model", "Distinct image files saved locally and attached to the post."),
    ("Preview", "Postiz UI", "Caption and media are shown before publishing."),
])
paragraph("A valid API key, supported model and available API quota are required. An OpenAI consumer subscription does not automatically provide API credits. If OpenAI has insufficient quota, either add API billing or select Gemini for manual rewriting.")

doc.add_heading("5. How to create and publish a post", level=1)
doc.add_heading("5.1 Connect social channels", level=2)
steps([
    "Open Postiz at http://localhost:4007 and select Add Channel.",
    "For Facebook/Instagram, authenticate with the Meta account that administers the Page and Instagram professional account.",
    "Choose the Page and account required for the post. The channel icons appear at the top of the Create Post screen.",
    "If the connection fails, first verify the Facebook app ID/secret, redirect URL, app role, Page permissions and Meta app review status in the Admin UI and Meta Developers portal.",
])
doc.add_heading("5.2 Create a manual post", level=2)
steps([
    "Click Create Post in Calendar and select one or more connected channels.",
    "Write the caption in the composer. Use the media controls to upload existing assets or select images already present in the media library.",
    "For Instagram, ensure at least one image/video thumbnail is attached; Instagram cannot publish a text-only feed post.",
    "Use Preview Post to inspect the platform-style preview, then save as draft, add to Calendar, or publish now.",
])
doc.add_heading("5.3 Generate a complete AI post", level=2)
steps([
    "Open the AI Create Post Assistant inside the composer.",
    "Enter the topic/product, tone, goal, audience, service area, language, brand name and optional hashtags. The fields are used to construct the text and image prompts.",
    "Choose whether to generate images and select the desired count. Each request should produce a different visual variation; review the thumbnails before posting.",
    "Select Generate AI Post. Text is generated first; Gemini image requests run for each requested variation and the returned files are attached to the same draft.",
    "Review the generated caption and media in Preview Post. You can remove individual images, regenerate, edit the caption, or save the result as a draft.",
])
doc.add_heading("5.4 Rewrite manual content with AI", level=2)
steps([
    "Write or paste your draft in the normal composer first.",
    "Open Rewrite this manual post, choose OpenAI or Gemini, then select a mood/style such as friendly, luxury, professional, concise or energetic.",
    "Select Rewrite Manual Post. The chosen provider receives the existing text plus the rewrite instruction and returns replacement copy.",
    "Review the result before saving. Rewriting changes text; it does not automatically create media unless image generation is requested separately.",
])

doc.add_heading("6. What happens when AI generates media", level=1)
paragraph("Postiz builds a visual prompt from the post topic, brand, audience, desired objects, mood, visual style, lighting and any custom prompt template. It sends one image request per requested variation. This is deliberate: one request per variation makes the images different rather than duplicating one response.")
steps([
    "Gemini returns image data for an accepted generation request.",
    "The Admin/UI workflow saves the image as a local Postiz media asset.",
    "The asset is added to the same draft as a thumbnail and is visible in Preview Post.",
    "When the draft is published, Postiz passes a public URL for each attachment to the selected social provider.",
    "The social provider fetches the file and creates either a single-image post or a multi-image/carousel post, subject to the platform's current API limits.",
])
paragraph("If the composer preview shows text but no image, verify that the media thumbnail exists below the caption. If a thumbnail exists but publishing fails, the usual cause is that the platform cannot fetch a localhost URL; follow the tunnel procedure in this guide.")

doc.add_heading("7. Cost model: assumptions and formulas", level=1)
paragraph("Prices below are planning estimates in USD, checked on 19 August 2026. Actual billing depends on the exact model, prompt length, output length, image resolution, region, provider account tier, retry count, taxes and any future price change. Treat them as estimates—not a fixed promise.")
table(["Estimate", "Assumption"], [
    ("Standard AI caption", "1,000 input tokens (brief + brand/prompt) and 350 output tokens (caption, hashtags and CTA)."),
    ("Manual rewrite", "500 input tokens (existing draft + instruction) and 350 output tokens."),
    ("Gemini image", "One generated output at the selected resolution. The image count field multiplies this cost."),
    ("No web grounding", "Examples do not include paid web/search grounding, storage or a tunnel subscription."),
])
paragraph("Formula: text cost = (input tokens / 1,000,000 × input rate) + (output tokens / 1,000,000 × output rate). Image cost = image count × the provider's price for the selected resolution. Total post cost = text cost + image cost + any optional platform/tunnel cost.")

doc.add_heading("8. Estimated cost per AI text post", level=1)
table(["Provider/model example", "Official list rate used", "Caption estimate", "Manual rewrite estimate"], [
    ("OpenAI GPT-5.4 mini", "$0.75 / 1M input; $4.50 / 1M output", "$0.002325 (about 0.23 US cents)", "$0.001950 (about 0.20 US cents)"),
    ("Gemini 3.1 Flash-Lite, Standard", "$0.25 / 1M input; $1.50 / 1M output", "$0.000775 (about 0.08 US cents)", "$0.000650 (about 0.07 US cents)"),
])
paragraph("Calculation example for the OpenAI caption: (1,000 ÷ 1,000,000 × $0.75) + (350 ÷ 1,000,000 × $4.50) = $0.002325. Long brand instructions, many retries, or unusually long captions increase the cost. OpenAI's official pricing page lists token rates; use the model selected in your Admin UI rather than assuming every model has the same price.")

doc.add_heading("9. Estimated Gemini image cost", level=1)
table(["Gemini 3.1 Flash Image output", "Standard paid price per image", "Example: 3 images"], [
    ("0.5K", "$0.045", "$0.135"),
    ("1K", "$0.067", "$0.201"),
    ("2K", "$0.101", "$0.303"),
    ("4K", "$0.151", "$0.453"),
])
paragraph("For a one-image post using the Gemini 3.1 Flash-Lite text estimate plus a 1K Gemini image, the estimated AI cost is about $0.067775. For a three-image post at 1K, it is about $0.201775. These are provider API costs only; Docker/local storage does not add a per-image cloud-storage fee, but your computer/VPS and any paid tunnel plan have their own costs.")
paragraph("The image model configured in Postiz must be image-capable and available to the project. Before deploying, confirm the exact model identifier and quota in Google AI Studio or Google Cloud. A text-only Gemini model cannot generate image output.")

doc.add_heading("10. Cost controls", level=1)
bullets([
    "Generate one image while testing prompts; increase to three or more only after the wording and visual style are correct.",
    "Use a lower image resolution for social posts where 4K is not necessary.",
    "Keep the AI brief concise. Reusable brand templates are useful, but very long prompts raise input-token cost.",
    "Avoid automatic retries without a limit. A failed image request may still be billable depending on the provider's policy.",
    "Use Gemini for text rewrites when OpenAI API credits are exhausted, but compare quality and current pricing in the provider dashboards.",
    "Set billing budgets/alerts in OpenAI and Google Cloud/AI Studio before enabling high-volume scheduling.",
])

doc.add_heading("11. Local media and ngrok", level=1)
paragraph("The stack uses STORAGE_PROVIDER=local. Generated files remain in the postiz_uploads Docker volume instead of Cloudflare/R2. Local previews work directly in the browser, but Facebook and Instagram cannot fetch http://localhost media URLs.")
bullets([
    "For local-only work, keep MAIN_URL and FRONTEND_URL as http://localhost:4007.",
    "For Facebook/Instagram publishing with local media, run the optional ngrok profile and set FRONTEND_URL to the active HTTPS forwarding URL.",
    "Keep MAIN_URL on localhost for normal local browser/API usage unless the entire installation is intentionally accessed through the public URL.",
    "Recreate the Postiz and Admin UI containers after changing .env so the updated URLs are loaded.",
])

doc.add_heading("12. Configuration", level=1)
paragraph("Create .env from .env.example and keep .env private. Docker Compose reads it automatically.")
code("cp .env.example .env")
table(["Variable", "Purpose"], [
    ("POSTGRES_PASSWORD / JWT_SECRET", "Required long random local secrets."),
    ("MAIN_URL", "Normal local URL: http://localhost:4007."),
    ("FRONTEND_URL", "Public base URL for externally fetched /uploads media."),
    ("OPENAI_API_KEY", "Optional text generation/rewrite key."),
    ("GEMINI_API_KEY", "Gemini text/image generation key."),
    ("GEMINI_MODEL / GEMINI_IMAGE_MODEL", "Selected Gemini text and image models."),
    ("GEMINI_PAID_IMAGE_MODE", "Enable when the selected Gemini image model requires paid billing."),
    ("NGROK_AUTHTOKEN", "Required only for the optional ngrok profile."),
    ("FACEBOOK_APP_ID / FACEBOOK_APP_SECRET", "Meta OAuth application credentials."),
])

doc.add_heading("13. Start on Windows", level=1)
steps([
    "Install and start Docker Desktop.",
    "Open PowerShell in the project folder and configure the private .env file.",
    "Build and start the stack.",
])
code("docker compose -f docker-compose.yml up -d --build")
code("docker compose -f docker-compose.yml ps")
paragraph("Open Postiz at http://localhost:4007, Admin UI at http://localhost:3001, and Temporal UI at http://localhost:8082.")

doc.add_heading("14. Start on Linux", level=1)
steps([
    "Install Docker Engine and Docker Compose v2, and ensure the Linux user can access the Docker daemon.",
    "Make setup-linux.sh executable and run it.",
])
code("chmod +x setup-linux.sh\n./setup-linux.sh")
paragraph("The script validates Docker, creates a private .env with generated local secrets when missing, builds and starts the stack, then prints the service URLs.")
code("./setup-linux.sh --with-ngrok\n./setup-linux.sh --no-build")

doc.add_heading("15. Tunnel procedure for publishing local media", level=1)
steps([
    "Add NGROK_AUTHTOKEN to the private .env file.",
    "Start the tunnel: docker compose -f docker-compose.yml --profile tunnel up -d ngrok.",
    "Open http://localhost:4040 and copy the HTTPS forwarding URL.",
    "Set FRONTEND_URL to that HTTPS URL in .env.",
    "Reload the services: docker compose -f docker-compose.yml up -d --force-recreate postiz admin-ui.",
    "Generate/attach media again, preview it, and schedule or publish the post.",
])
paragraph("Free ngrok URLs can change after a restart. When they do, update FRONTEND_URL and recreate the containers.")

doc.add_heading("16. Facebook and Instagram connection", level=1)
steps([
    "Create a Meta business application and add the Facebook Login / Manage Pages functionality required for the intended use case.",
    "Configure the redirect URL shown by Postiz. Local development commonly uses http://localhost:4007/integrations/social/facebook; public usage needs the matching public HTTPS URL.",
    "Enable the required Page permissions in the Meta app. Development users must be app administrators/testers; external users can require Meta review and production approval.",
    "Save the Meta app ID/secret in the Admin UI credentials page and apply/restart Postiz.",
    "Connect the Facebook Page and Instagram professional account in Add Channel, then create a media test post.",
])

doc.add_heading("17. Troubleshooting", level=1)
table(["Symptom", "Cause", "Resolution"], [
    ("CORS / cannot login", "Frontend and backend use different origins.", "For local use keep MAIN_URL and backend URL on http://localhost:4007, then recreate containers."),
    ("Instagram needs media", "No attached file in the draft.", "Generate/select an image, confirm thumbnails in the composer, then preview and schedule again."),
    ("Generated image will not publish", "A social platform cannot access a localhost URL.", "Use ngrok HTTPS and set FRONTEND_URL to the active public URL."),
    ("AI image failed", "Key/model/quota or billing issue.", "Check Gemini key, model, paid-image setting, quota and Postiz logs."),
    ("OpenAI rewrite has no credits", "OpenAI API balance is exhausted.", "Add API credits or select Gemini for the manual rewrite provider."),
    ("Scheduled post is missing", "Draft was not scheduled or its background job failed.", "Check Calendar, Temporal UI, and docker compose logs -f postiz."),
    ("Facebook invalid scopes", "Meta app lacks the Page use case or permission.", "Add the correct Meta use case/permissions and check app roles/review status."),
])

doc.add_heading("18. Useful operations", level=1)
code("docker compose -f docker-compose.yml ps\ndocker compose -f docker-compose.yml logs -f postiz\ndocker compose -f docker-compose.yml logs -f admin-ui\ndocker compose -f docker-compose.yml restart postiz admin-ui\ndocker compose -f docker-compose.yml down")
paragraph("docker compose down stops the stack. Named volumes retain data and uploads unless they are explicitly removed separately.")

doc.add_heading("19. Security checklist", level=1)
bullets([
    "Never commit .env, OAuth secrets, API keys, database passwords, JWT secrets or ngrok authtokens.",
    "Use .env.example only for placeholders and configuration guidance.",
    "Restrict and rotate API keys, especially any key that was copied into chat, screenshots or logs.",
    "Use HTTPS for external callback and media URLs.",
    "Limit access to the host and the Docker-socket-mounted Admin UI.",
])

doc.add_heading("20. Important project files", level=1)
table(["Path", "Purpose"], [
    ("docker-compose.yml", "Customized service stack plus optional ngrok profile."),
    ("Dockerfile.postiz-facebook-oauth-admin-ui-v25", "Postiz application customization layer."),
    ("admin-ui/", "Credentials, AI configuration, Docker/health routes and management UI."),
    ("setup-linux.sh", "Linux setup/start helper."),
    (".env.example", "Safe configuration reference."),
    (".env", "Private local configuration; excluded from Git."),
])

doc.add_heading("21. Official pricing and API references", level=1)
paragraph("OpenAI API pricing (token and image pricing): https://platform.openai.com/pricing")
paragraph("OpenAI API quickstart and API-key guidance: https://platform.openai.com/docs/quickstart/make-your-first-api-request")
paragraph("Gemini API pricing (text and image pricing): https://ai.google.dev/gemini-api/docs/pricing")
paragraph("Gemini image generation guide and current model guidance: https://ai.google.dev/gemini-api/docs/image-generation")
paragraph("Always verify the official pages before budgeting a production campaign because provider prices, model names, availability and quotas change.")

footer = doc.add_paragraph("End of guide")
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
footer.runs[0].italic = True
doc.save(OUTPUT)
print(OUTPUT.resolve())
