import re

path = r"C:\Users\Manas Varade\.gemini\antigravity\scratch\doctor-appointment-agent\frontend\src\pages\AdminDashboard.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's inspect occurrences of logger.error(err)
# and replace them with logger.error(String(err))
# also check for logger.error(error) -> logger.error(String(error))
# also check for catch (err: any) or cast them.

fixed_content = content
fixed_content = re.sub(r'logger\.error\(err\)', 'logger.error(String(err))', fixed_content)
fixed_content = re.sub(r'logger\.error\(error\)', 'logger.error(String(error))', fixed_content)

if fixed_content != content:
    print("Replacements made!")
    with open(path, "w", encoding="utf-8") as f:
        f.write(fixed_content)
else:
    print("No replacements made, let's look for logger.error.")
    # let's find where logger.error is called
    for m in re.finditer(r'logger\.error', content):
        start = max(0, m.start() - 50)
        end = min(len(content), m.end() + 50)
        print("Found:", content[start:end])
