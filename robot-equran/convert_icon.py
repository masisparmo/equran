from PIL import Image
import os

def convert_png_to_ico(png_path, ico_path):
    if not os.path.exists(png_path):
        print(f"Error: {png_path} not found.")
        return

    img = Image.open(png_path)

    # Define standard sizes for Windows ICO
    sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

    # Save as ICO
    img.save(ico_path, format='ICO', sizes=sizes)
    print(f"Successfully converted {png_path} to {ico_path}")

if __name__ == "__main__":
    convert_png_to_ico("app_icon.png", "app_icon.ico")
