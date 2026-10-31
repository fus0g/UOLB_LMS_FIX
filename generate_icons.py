import os
from PIL import Image, ImageDraw, ImageFont

def create_icon(size):
    # Colors: Navy blue from university brand (#222B56), Gold accent (#F8B800), White
    bg_color = (34, 43, 86)       # #222B56
    gold_color = (248, 184, 0)     # #F8B800
    white_color = (255, 255, 255)  # #FFFFFF
    
    # Create image with RGBA
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Rounded rectangle background
    corner_radius = int(size * 0.22)
    padding = max(1, int(size * 0.04))
    
    # Outer bounding box
    bbox = [padding, padding, size - padding - 1, size - padding - 1]
    
    # Draw rounded background
    draw.rounded_rectangle(bbox, radius=corner_radius, fill=bg_color)
    
    # Draw subtle gold border
    border_width = max(1, int(size * 0.04))
    draw.rounded_rectangle(bbox, radius=corner_radius, outline=gold_color, width=border_width)
    
    # Draw an academic graduation cap / shield + key / "LMS" styling
    # Let's draw an academic mortarboard (graduation cap)
    cx = size / 2
    cy = size * 0.46
    w = size * 0.62
    h = size * 0.28
    
    # Diamond top of mortarboard
    diamond = [
        (cx, cy - h/2),         # Top
        (cx + w/2, cy),         # Right
        (cx, cy + h/2),         # Bottom
        (cx - w/2, cy)          # Left
    ]
    draw.polygon(diamond, fill=white_color)
    
    # Cap skull cap underneath
    skull_w = w * 0.55
    skull_top = cy + h * 0.1
    skull_bot = cy + h * 0.95
    skull = [
        (cx - skull_w/2, skull_top),
        (cx + skull_w/2, skull_top),
        (cx + skull_w/2, skull_bot - h*0.3),
        (cx, skull_bot),
        (cx - skull_w/2, skull_bot - h*0.3),
    ]
    draw.polygon(skull, fill=(210, 220, 240))
    
    # Tassel (Gold) hanging to the right
    tassel_origin = (cx, cy)
    tassel_bend = (cx + w*0.42, cy + h*0.2)
    tassel_end = (cx + w*0.42, cy + h*0.9)
    
    tassel_width = max(1, int(size * 0.04))
    draw.line([tassel_origin, tassel_bend, tassel_end], fill=gold_color, width=tassel_width)
    draw.ellipse([tassel_end[0] - tassel_width*1.5, tassel_end[1] - tassel_width, 
                  tassel_end[0] + tassel_width*1.5, tassel_end[1] + tassel_width*2], fill=gold_color)
    
    # Draw small keyhole or text "12" / "SSO" badge at bottom if size permits
    if size >= 48:
        # Draw a small gold pill badge with "12" or key symbol
        badge_w = size * 0.44
        badge_h = size * 0.22
        badge_y = size * 0.68
        badge_bbox = [cx - badge_w/2, badge_y, cx + badge_w/2, badge_y + badge_h]
        draw.rounded_rectangle(badge_bbox, radius=int(badge_h/2), fill=gold_color)
        
        # Draw "12" text or key in navy
        # Let's draw stylized "12" lines:
        # Number 1
        num_color = bg_color
        stroke = max(1, int(size * 0.035))
        # '1'
        draw.line([(cx - badge_w*0.24, badge_y + badge_h*0.35), (cx - badge_w*0.16, badge_y + badge_h*0.25), (cx - badge_w*0.16, badge_y + badge_h*0.75)], fill=num_color, width=stroke)
        draw.line([(cx - badge_w*0.24, badge_y + badge_h*0.75), (cx - badge_w*0.08, badge_y + badge_h*0.75)], fill=num_color, width=stroke)
        
        # '2'
        x2 = cx + badge_w*0.12
        # top arch of 2
        draw.arc([x2 - badge_w*0.14, badge_y + badge_h*0.22, x2 + badge_w*0.14, badge_y + badge_h*0.5], start=180, end=0, fill=num_color, width=stroke)
        draw.line([(x2 + badge_w*0.14, badge_y + badge_h*0.36), (x2 - badge_w*0.14, badge_y + badge_h*0.75)], fill=num_color, width=stroke)
        draw.line([(x2 - badge_w*0.14, badge_y + badge_h*0.75), (x2 + badge_w*0.16, badge_y + badge_h*0.75)], fill=num_color, width=stroke)

    return img

os.makedirs('icons', exist_ok=True)
for sz in [16, 48, 128]:
    img = create_icon(sz)
    img.save(f'icons/icon{sz}.png')
    print(f"Generated icons/icon{sz}.png ({sz}x{sz})")

