import sys

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # BusResultsPage fixes
    content = content.replace('const res = await api.get(/wimb/buses/between?from=&to=);', 'const res = await api.get(/wimb/buses/between?from=&to=);')
    content = content.replace('const res = await api.get(/wimb/buses/);', 'const res = await api.get(/wimb/buses/);')
    content = content.replace('navigate(/student/live-tracking?tripId=);', 'navigate(/student/live-tracking?tripId=);')

    # WhereIsMyBusPage fixes
    content = content.replace('api.get(/wimb/stops/search?q=)', 'api.get(/wimb/stops/search?q=)')
    content = content.replace('api.get(/wimb/stops/search?q=)', 'api.get(/wimb/stops/search?q=)') # In case I broke it
    
    # Let's just do a clean fix for WhereIsMyBusPage by matching the broken parts
    if 'debouncedFrom.length >= 1' in content:
        # replace the next api.get
        content = content.replace('api.get(/wimb/stops/search?q=)\n        .then(res => setFromSuggestions', 'api.get(/wimb/stops/search?q=)\n        .then(res => setFromSuggestions')

    if 'debouncedTo.length >= 1' in content:
        content = content.replace('api.get(/wimb/stops/search?q=)\n        .then(res => setToSuggestions', 'api.get(/wimb/stops/search?q=)\n        .then(res => setToSuggestions')
        content = content.replace('api.get(/wimb/stops/search?q=)\n        .then(res => setToSuggestions', 'api.get(/wimb/stops/search?q=)\n        .then(res => setToSuggestions')

    if 'debouncedBus.length >= 1' in content:
        content = content.replace('api.get(/wimb/buses/search?q=)\n        .then(res => setBusSearchResults', 'api.get(/wimb/buses/search?q=)\n        .then(res => setBusSearchResults')
        content = content.replace('api.get(/wimb/buses/search?q=)\n        .then(res => setBusSearchResults', 'api.get(/wimb/buses/search?q=)\n        .then(res => setBusSearchResults')

    content = content.replace('navigate(/student/bus-results?from=&to=);', 'navigate(/student/bus-results?from=&to=);')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('frontend/src/pages/student/BusResultsPage.jsx')
fix_file('frontend/src/pages/student/WhereIsMyBusPage.jsx')

