import os
from PIL import Image, ImageDraw

def create_transparent_assets():
    os.makedirs("assets/img", exist_ok=True)
    width, height = 420, 562
    
    # 1. eye-calm.webp (기본 눈 - 동그란 카툰 눈)
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # 눈 위치: x=201, 218, y=130 대략 반지름 4픽셀
    draw.ellipse([201 - 3, 130 - 3, 201 + 3, 130 + 3], fill=(20, 20, 20, 255))
    draw.ellipse([218 - 3, 130 - 3, 218 + 3, 130 + 3], fill=(20, 20, 20, 255))
    # 반짝임 하이라이트
    draw.ellipse([200 - 1, 129 - 1, 200 + 1, 129 + 1], fill=(255, 255, 255, 255))
    draw.ellipse([217 - 1, 129 - 1, 217 + 1, 129 + 1], fill=(255, 255, 255, 255))
    img.save("assets/img/eye-calm.webp", "WEBP")
    print("Created: assets/img/eye-calm.webp")
    
    # 2. eye-smile.webp (웃는 눈 - 휘어지는 눈썹 모양)
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # 왼쪽 웃는눈
    draw.arc([198, 124, 205, 132], start=180, end=360, fill=(20, 20, 20, 255), width=2)
    # 오른쪽 웃는눈
    draw.arc([214, 124, 221, 132], start=180, end=360, fill=(20, 20, 20, 255), width=2)
    img.save("assets/img/eye-smile.webp", "WEBP")
    print("Created: assets/img/eye-smile.webp")
    
    # 3. eye-sharp.webp (날카로운 눈 - 삼각형 카툰 눈)
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # 왼쪽 날카로운 눈
    draw.polygon([(197, 132), (205, 128), (202, 133)], fill=(20, 20, 20, 255))
    # 오른쪽 날카로운 눈
    draw.polygon([(222, 132), (214, 128), (217, 133)], fill=(20, 20, 20, 255))
    img.save("assets/img/eye-sharp.webp", "WEBP")
    print("Created: assets/img/eye-sharp.webp")
    
    # 4. acc-glasses.webp (액세서리 안경)
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # 안경 렌즈 테두리 (검은색 뿔테)
    draw.ellipse([201 - 8, 130 - 8, 201 + 8, 130 + 8], outline=(30, 30, 30, 255), width=2)
    draw.ellipse([218 - 8, 130 - 8, 218 + 8, 130 + 8], outline=(30, 30, 30, 255), width=2)
    # 렌즈 반사 효과 (사선)
    draw.line([198, 132, 203, 126], fill=(255, 255, 255, 120), width=1)
    draw.line([215, 132, 220, 126], fill=(255, 255, 255, 120), width=1)
    # 안경 다리 연결선 (브릿지)
    draw.line([201 + 8, 130, 218 - 8, 130], fill=(30, 30, 30, 255), width=2)
    # 양옆 다리
    draw.line([193, 130, 175, 127], fill=(30, 30, 30, 255), width=2)
    draw.line([226, 130, 244, 127], fill=(30, 30, 30, 255), width=2)
    img.save("assets/img/acc-glasses.webp", "WEBP")
    print("Created: assets/img/acc-glasses.webp")

    # 5. face-features.webp (코/입 공용 레이어)
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # 코 (x=209.5, y=140 근처)
    draw.polygon([(209, 138), (207, 143), (210, 143)], fill=(0, 0, 0, 40))
    # 일반 입 (미소 - x=209.5, y=152 근처)
    draw.arc([204, 148, 215, 154], start=0, end=180, fill=(20, 20, 20, 255), width=2)
    img.save("assets/img/face-features.webp", "WEBP")
    print("Created: assets/img/face-features.webp")

if __name__ == '__main__':
    create_transparent_assets()
