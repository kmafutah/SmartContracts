from PIL import Image
import io
import numpy as np
import cv2
import matplotlib.pyplot as plt
import cairosvg

# Load the uploaded PNG image
image_path = "AA03A0FB-27AF-494F-B0A9-744F5098696C.PNG"
image = Image.open(image_path).convert("RGBA")

# Convert image to numpy array and remove background
image_np = np.array(image)
# Create a binary mask for gold areas (approximation)
gold_mask = (image_np[:, :, 0] > 180) & (image_np[:, :, 1] > 140) & (image_np[:, :, 2] < 100)
# Create a binary image
binary_image = (gold_mask * 255).astype(np.uint8)

# Find contours
contours, _ = cv2.findContours(binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

# Generate SVG path from contours
def contours_to_svg_path(contours, scale=1.0):
    svg_paths = []
    for contour in contours:
        path_data = "M " + " L ".join(f"{int(p[0][0] * scale)},{int(p[0][1] * scale)}" for p in contour) + " Z"
        svg_paths.append(f'<path d="{path_data}" fill="#D4AF37"/>')  # Gold fill
    return "\n".join(svg_paths)

# Create minimal SVG
width, height = image.size
svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="32" height="32">
{contours_to_svg_path(contours)}
</svg>'''

# Save the SVG content to a file
svg_path = "ZiGT_icon_only.svg"
with open(svg_path, "w") as f:
    f.write(svg_content)

svg_path
