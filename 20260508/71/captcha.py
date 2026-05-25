import random
import string
import io
from PIL import Image, ImageDraw, ImageFont, ImageFilter


def generate_captcha_text(length=4):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))


def random_light_color():
    return (
        random.randint(220, 255),
        random.randint(220, 255),
        random.randint(220, 255)
    )


def random_dark_color():
    return (
        random.randint(0, 80),
        random.randint(0, 80),
        random.randint(0, 80)
    )


def generate_captcha_image(text, width=160, height=50):
    image = Image.new('RGB', (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(image)

    for x in range(width):
        for y in range(height):
            draw.point((x, y), fill=random_light_color())

    try:
        font = ImageFont.truetype("arial.ttf", 30)
    except:
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 30)
        except:
            font = ImageFont.load_default()

    for i, char in enumerate(text):
        x = 15 + i * 34
        y = random.randint(5, 15)
        angle = random.randint(-15, 15)

        char_image = Image.new('RGBA', (40, 40), (0, 0, 0, 0))
        char_draw = ImageDraw.Draw(char_image)
        char_draw.text((0, 0), char, font=font, fill=random_dark_color())
        char_image = char_image.rotate(angle, resample=Image.BICUBIC)
        image.paste(char_image, (x, y), char_image)

    for _ in range(3):
        x1 = random.randint(0, width)
        y1 = random.randint(0, height)
        x2 = random.randint(0, width)
        y2 = random.randint(0, height)
        draw.line((x1, y1, x2, y2), fill=(random.randint(150, 200), random.randint(150, 200), random.randint(150, 200)), width=1)

    for _ in range(20):
        x = random.randint(0, width)
        y = random.randint(0, height)
        draw.point((x, y), fill=random_dark_color())

    buf = io.BytesIO()
    image.save(buf, format='PNG')
    buf.seek(0)
    return buf
