import os
import re

filepath = 'frontend/src/pages/student/BusResultsPage.jsx'
with open(filepath, 'rb') as f:
    content = f.read()

pattern = b'<div className={ [^>]* }></div>'
replacement = b'<div className={bsolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm }></div>'

new_content = re.sub(pattern, replacement, content)

with open(filepath, 'wb') as f:
    f.write(new_content)

print("Fixed!")
