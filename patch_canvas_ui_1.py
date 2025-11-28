import re

# Read the file
with open(r'c:\Users\xX69Xx\Desktop\IDI\fork-i\VRmol-master\libs\canvas-ui.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add menuDistance property
content = content.replace(
    "    currentTab: 'main', // 'main', 'structure', 'ligand', 'display'",
    "    currentTab: 'main', // 'main', 'structure', 'ligand', 'display'\n    menuDistance: 6, // Distance from camera, adjustable with W/S"
)

# 2. Add buttons initialization
content = content.replace(
    "        this.context = this.canvas.getContext('2d');",
    "        this.context = this.canvas.getContext('2d');\n        this.buttons = []; // Reinitialize buttons array"
)

# 3. Change title
content = content.replace(
    "ctx.fillText('VR Controls', 80, 110);",
    "ctx.fillText('Menu', 80, 110);"
)

#4. Add drawSelection call
content = content.replace(
    "        this.texture.needsUpdate = true;\n    },\n\n    drawHeader:",
    "        // Draw Selection Highlight\n        this.drawSelection(ctx);\n\n        this.texture.needsUpdate = true;\n    },\n\n    drawHeader:"
)

# Write the file
with open(r'c:\Users\xX69Xx\Desktop\IDI\fork-i\VRmol-master\libs\canvas-ui.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch 1/3 applied successfully")
