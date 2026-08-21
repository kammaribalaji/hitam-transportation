import json
import re

# Load the current master transport database to update
with open(r"C:\PROJECT'S\HITAM TRANSPORT\hitam-transport\backend\src\data\master_transport_database.json", "r", encoding="utf-8") as f:
    master_db = json.load(f)

# The exact 1,100 deduplicated passengers from the authentic sheets
passengers = master_db.get("passengers", [])

print(f"Total authentic passengers in master database: {len(passengers)}")

# Map passengers by roll number and clean name
enrolled_rolls = set()
for p in passengers:
    enrolled_rolls.add(p["rollNumber"].upper().trim() if isinstance(p["rollNumber"], str) else str(p["rollNumber"]))

print(f"Unique enrolled passenger roll numbers: {len(enrolled_rolls)}")
