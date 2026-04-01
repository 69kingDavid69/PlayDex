#!/usr/bin/env python3
from PIL import Image
import sys

# Create a simple 32x32 RGBA image (blue square with transparency)
img = Image.new('RGBA', (32, 32), (0, 0, 255, 255))
# Make corners transparent for testing
for x in range(32):
    for y in range(32):
        if (x < 4) or (y < 4) or (x >= 28) or (y >= 28):
            img.putpixel((x, y), (0, 0, 255, 0))
img.save('icons/32x32_rgba.png', 'PNG')
print('Icon generated')